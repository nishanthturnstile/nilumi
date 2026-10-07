"""Generate labelled synthetic smoke fixtures; these are not household evidence."""
import json
import os
import subprocess
import wave
from pathlib import Path

root = Path(__file__).resolve().parent.parent
out = root / 'clips/generated'
out.mkdir(parents=True, exist_ok=True)
espeak = os.environ.get('ESPEAK_BIN', 'espeak-ng')
ffmpeg = os.environ.get('FFMPEG_BIN', 'ffmpeg')
path_flag = ['--path=' + os.environ['ESPEAK_DATA_PATH']] if os.environ.get('ESPEAK_DATA_PATH') else []

def encode(source, target, *options):
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source), *options, str(target)], check=True)

entries = json.loads((root / 'clips/clips.json').read_text())
for i, entry in enumerate(entries):
    raw = out / 'raw.wav'
    # Alternating synthetic English voices exercise a different signal, not adults' accents.
    voice = 'ta' if 'tanglish' in entry['tags'] else ['en-gb', 'en-us'][i % 2]
    subprocess.run([espeak, *path_flag, '-v', voice, '-s', '145', '-w', str(raw), entry['speech']], check=True)
    encode(raw, out / entry['file'], '-ar', '16000', '-ac', '1')
    with wave.open(str(out / entry['file'])) as audio:
        duration = audio.getnframes() / audio.getframerate()
        if duration >= 30:
            raise ValueError(f'{entry["file"]} exceeds the REST clip limit')
    entry.update(noise='synthetic-clean', speaker=voice, kind='synthetic-smoke', durationSeconds=duration)
raw.unlink(missing_ok=True)
first = out / entries[0]['file']
variants = [
    ('format-webm.webm', ['-c:a', 'libopus'], 'webm-opus'),
    ('format-mp4.mp4', ['-c:a', 'aac'], 'mp4-aac'),
    ('format-m4a.m4a', ['-c:a', 'aac'], 'm4a-aac'),
    ('quiet.wav', ['-af', 'volume=0.12'], 'synthetic-low-volume'),
    ('fast.wav', ['-af', 'atempo=1.35'], 'synthetic-fast'),
    ('slow.wav', ['-af', 'atempo=0.8'], 'synthetic-slow'),
    ('fan.wav', ['-af', 'aeval=val(0)+0.025*sin(2*PI*100*t)'], 'synthetic-hum'),
]
for name, options, noise in variants:
    encode(first, out / name, *options)
    entries.append(dict(entries[0], file=name, noise=noise, tags=['format' if name.startswith('format') else 'synthetic-noise', *entries[0]['tags']]))
# Deterministic competing speech approximates overlapping TV speech, not a real television.
subprocess.run([espeak, *path_flag, '-v', 'en-us', '-w', str(out / 'tv-background.wav'), 'The weather forecast says rain tomorrow. Welcome to the evening news.'], check=True)
subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(first), '-i', str(out / 'tv-background.wav'), '-filter_complex', '[1:a]volume=0.15[b];[0:a][b]amix=inputs=2:duration=first,volume=2', '-ar', '16000', '-ac', '1', str(out / 'tv.wav')], check=True)
(out / 'tv-background.wav').unlink()
entries.append(dict(entries[0], file='tv.wav', noise='synthetic-competing-speech', tags=['synthetic-noise', 'brand']))
with wave.open(str(out / 'silence.wav'), 'wb') as audio:
    audio.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
    audio.writeframes(bytes(16000 * 2 * 2))
entries.append(dict(entries[0], file='silence.wav', noise='silence', tags=['negative-control'], expectedSilence=True))
(out / 'corrupt.wav').write_bytes(b'This is deliberately not an audio file.')
entries.append(dict(entries[0], file='corrupt.wav', noise='invalid-container', tags=['negative-control'], expectedStatus='error'))
(out / 'manifest.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2) + '\n')
print(f'Generated {len(entries)} synthetic scenarios in {out}')
