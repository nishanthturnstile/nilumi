"""Build offline listening controls from verified, already-synthesized PCM.

No provider calls. No runtime audio processing or accepted timing is changed.
Run against the two prefixControls in the saved v4 phone analysis JSON.
"""

import argparse
import base64
import hashlib
import html
import io
import json
from pathlib import Path
import struct
import wave


def wav_bytes(pcm, rate):
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(pcm)
    return output.getvalue()


def build_controls(report, pcm_dir, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    cards = []
    results = []
    names = {"android/mobile": "android-date-v4", "iphone/mobile": "iphone-short-v4"}
    for clip in report["prefixControls"]:
        name = names[clip["combination"]]
        pcm = (pcm_dir / f"{name}.pcm").read_bytes()
        if len(pcm) != clip["pcmBytes"] or hashlib.sha256(pcm).hexdigest() != clip["sha256"]:
            raise ValueError("Existing clip does not match verified source fingerprint")
        rate = clip["sampleRate"]
        if rate != 22050 or len(pcm) % 2:
            raise ValueError("Expected mono 22,050 Hz PCM16")
        samples = struct.unpack(f"<{len(pcm) // 2}h", pcm)
        initial_zeros = next((i for i, sample in enumerate(samples) if sample), len(samples))
        guard_frames = round(rate * 0.020)
        removal_bound = round(rate * 0.120)
        # Ambiguous/nonzero audio is always kept. All-zero clips stay untouched.
        removed = min(removal_bound, max(0, initial_zeros - guard_frames)) if initial_zeros < len(samples) else 0
        trimmed = pcm[removed * 2:]
        assert all(sample == 0 for sample in samples[:removed])
        assert trimmed == pcm[removed * 2:]
        removed_ms = removed / rate * 1000
        result = {
            "trialId": clip["trialId"],
            "combination": clip["combination"],
            "fixture": clip["fixture"],
            "originalPcmSha256": clip["sha256"],
            "trimmedPcmSha256": hashlib.sha256(trimmed).hexdigest(),
            "sampleRate": rate,
            "initialZeroFrames": initial_zeros,
            "removedFrames": removed,
            "removedMs": removed_ms,
            "guardFrames": guard_frames,
            "maxRemovalFrames": removal_bound,
            "nonzeroSamplesRemoved": 0,
            "retainedPcmByteIdentical": True,
            "originalReportedOnsetMs": clip["originalFirstAudioMs"],
            "hypotheticalOnsetMs": clip["originalFirstAudioMs"] - removed_ms,
            "listeningApproved": False,
            "phoneBenchmark": False,
        }
        results.append(result)
        players = []
        for label, data in [("Original", pcm), ("Initial zeros removed", trimmed)]:
            wav = wav_bytes(data, rate)
            suffix = "original" if label == "Original" else "exact-zero-control"
            (output_dir / f"{name}-{suffix}.wav").write_bytes(wav)
            uri = "data:audio/wav;base64," + base64.b64encode(wav).decode("ascii")
            players.append(f'<p>{html.escape(label)}</p><audio controls preload="none" src="{uri}"></audio>')
        cards.append(
            f'<section><h2>{html.escape(clip["combination"])} — {html.escape(clip["fixture"])}</h2>'
            f'<p>Control removes {removed_ms:.2f} ms of initial exact zeros. '
            'Quiet nonzero audio and internal pauses remain unchanged.</p>' + "".join(players) + '</section>'
        )
    (output_dir / "prefix-controls.json").write_text(json.dumps({
        "schema": "s4-offline-prefix-controls-1",
        "paidCalls": 0,
        "runtimeChanged": False,
        "controls": results,
    }, indent=2) + "\n")
    page = '''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>S4 offline audio comparison</title>
<style>body{max-width:720px;margin:32px auto;padding:0 20px;font:17px/1.5 system-ui;color:#202020}
section{border-top:1px solid #ddd;margin-top:24px;padding-top:12px}audio{width:100%}</style>
<h1>S4 offline audio comparison</h1>
<p>Saved synthetic Ritu clips. This page makes no network or speech requests.</p>
<p>On each phone, use the same speaker output and volume. Compare the two versions.
Listen for a missing or changed first sound, click, or unnatural start. Report which
you prefer. These listening controls do not measure first-audio latency.</p>
<p>The control retains a 20 ms guard and removes at most 120 ms of initial exact zeros.
It never removes quiet nonzero samples.</p>''' + "".join(cards) + '''
<script>document.querySelectorAll('audio').forEach(a=>a.addEventListener('play',()=>{
document.querySelectorAll('audio').forEach(b=>{if(b!==a)b.pause()})}));</script></html>'''
    (output_dir / "listen.html").write_text(page)
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--pcm-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = build_controls(json.loads(args.report.read_text()), args.pcm_dir, args.output)
    print(json.dumps({"paidCalls": 0, "controls": result}, indent=2))
