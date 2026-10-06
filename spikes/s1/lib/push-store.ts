import type { PushSubscription } from "web-push";

// Share across Next route bundles. Still spike-only: a restart clears this map.
const globalStore = globalThis as typeof globalThis & {
  nilumiPushSubscriptions?: Map<string, Map<string, PushSubscription>>;
  nilumiPushPending?: Set<string>;
};
export const subscriptions = globalStore.nilumiPushSubscriptions ??= new Map();
export const pendingTests = globalStore.nilumiPushPending ??= new Set();
