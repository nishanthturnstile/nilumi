// Synthetic text only. Freeze these settings and corpus before live measurement.
export const LEGACY_VOICE_VERSION = "s4-bulbul-v3-1";
export const LEGACY_STREAM_VOICE_VERSION = "s4-bulbul-v3-stream-2";
export const LEGACY_APPLICATION_VOICE_VERSION = "s4-bulbul-v3-stream-3";
export const LEGACY_POOL_VOICE_VERSION = "s4-bulbul-v3-stream-4";
export const PREVIOUS_VOICE_VERSION = "s4-bulbul-v3-stream-5";
export const LEGACY_DIAGNOSTIC_VOICE_VERSION = "s4-bulbul-v3-stream-6";
export const LEGACY_ROUTING_VOICE_VERSION = "s4-bulbul-v3-stream-7";
export const VOICE_VERSION = "s4-bulbul-v3-stream-8";
export const VOICE_SELECTION_VERSIONS = [
  VOICE_VERSION,
  LEGACY_ROUTING_VOICE_VERSION,
  LEGACY_DIAGNOSTIC_VOICE_VERSION,
  PREVIOUS_VOICE_VERSION,
  LEGACY_POOL_VOICE_VERSION,
  LEGACY_APPLICATION_VOICE_VERSION,
  LEGACY_STREAM_VOICE_VERSION,
  LEGACY_VOICE_VERSION,
] as const;
export const PLAYBACK_STARTUP_MS = 20;
export const VOICE_PROFILE = "http-pcm-pool15s-network-worker-zero-prefix-20ms";
export const ZERO_PREFIX_POLICY = {
  version: "s4-exact-zero-prefix-1",
  retainedMs: 10,
  maximumTrimMs: 200,
  minimumRemainingChunkMs: 80,
  firstChunkOnly: true,
} as const;
export const PROVIDER_POOL_POLICY = {
  connections: 2,
  pipelining: 1,
  keepAliveTimeout: 15_000,
  keepAliveMaxTimeout: 15_000,
  keepAliveTimeoutThreshold: 2_000,
  allowH2: false,
} as const;
export const SMOKE_IDS = ["short", "shopping"] as const;
export const SMOKE_PAUSE_MS = 6_000;
export const ONSET_METHOD = "audio-context-non-silent-sample-output-timestamp";
export const VOICE_TRANSPORT = "http-stream-wav-to-pcm16";
export const VOICES = ["ritu", "priya", "simran", "shubh"] as const;
export type Voice = (typeof VOICES)[number];
export const TTS_SETTINGS = {
  model: "bulbul:v3",
  language_code: "en-IN",
  pace: 1,
  temperature: 0.6,
  speech_sample_rate: 22050,
  output_audio_codec: "wav",
} as const;
export const SENTENCES = [
  { id: "shopping", text: "Added milk and rice to the shopping list." },
  {
    id: "reminder",
    text: "I will remind you tomorrow at seven in the morning.",
  },
  { id: "date", text: "The appointment is on Tuesday, October thirteenth." },
  { id: "number", text: "You have three tasks and two reminders for today." },
  { id: "name", text: "Kavitha prefers the Amul brand of milk." },
  {
    id: "answer",
    text: "The spare keys are in the drawer near the front door.",
  },
  { id: "short", text: "Your list is up to date." },
  { id: "undo", text: "Undone. The item is back on your shopping list." },
  { id: "clarify", text: "Did you mean this Friday or the Friday after that?" },
  {
    id: "unknown",
    text: "I do not have that information yet. You can tell me.",
  },
  { id: "tanglish", text: "Naalai kaalai, please remember to buy paal." },
  { id: "tamil", text: "நாளை காலை பால் வாங்க வேண்டும்." },
] as const;
export const LISTENING_IDS = [
  "shopping",
  "reminder",
  "date",
  "name",
  "tanglish",
  "tamil",
];
export const BENCHMARK_IDS = SENTENCES.slice(0, 10).map(
  (sentence) => sentence.id,
);
export const COMBINATIONS = [
  "iphone/wifi",
  "iphone/mobile",
  "android/wifi",
  "android/mobile",
] as const;
// 20% billing/tax headroom, plus UTF-8-byte counting (conservative for Indic text).
export const reserveTtsMicros = (text: string) =>
  Math.ceil(new TextEncoder().encode(text).length * 3000 * 1.2);
