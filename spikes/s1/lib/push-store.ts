// In-memory for the spike: subscriptions vanish on redeploy. The production
// path stores them per member (§15.5).
export const subscriptions: string[] = [];
