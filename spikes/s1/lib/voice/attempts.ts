import type { ServerTrace } from "./timing";

// One process owns descriptors and cancellation in this one-replica spike.
// Disk remains authoritative after restart; reservations are never cached here.
export type AttemptDescriptor = {
  id: string;
  owner: string;
  expires: number;
  cancelled: boolean;
};
export type AttemptState<T extends AttemptDescriptor> = {
  item: T;
  fresh: boolean;
  trace?: ServerTrace;
  sharedProducer?: boolean;
};
type IndexCell<T extends AttemptDescriptor> = {
  state?: AttemptState<T>;
  promise: Promise<AttemptState<T>>;
  users: number;
};
export class AttemptIndex<T extends AttemptDescriptor> {
  private entries = new Map<string, IndexCell<T>>();
  constructor(private readonly limit = 1000) {}
  private room() {
    for (const [key, entry] of this.entries) {
      if (!entry.users && entry.state && entry.state.item.expires <= Date.now())
        this.entries.delete(key);
    }
    if (this.entries.size < this.limit) return;
    for (const [key, entry] of this.entries) {
      if (!entry.users && entry.state) {
        this.entries.delete(key);
        return;
      }
    }
    throw new Error("attempt_index_busy");
  }
  remember(key: string, item: T) {
    this.room();
    const state = { item, fresh: true };
    this.entries.set(key, { state, promise: Promise.resolve(state), users: 0 });
  }
  async acquire(key: string, load: () => Promise<T>) {
    let entry = this.entries.get(key);
    const source: "prepared" | "memory" | "disk" = entry
      ? entry.state?.fresh
        ? "prepared"
        : "memory"
      : "disk";
    if (!entry) {
      this.room();
      const cell: IndexCell<T> = {
        users: 0,
        promise: load().then((item) => {
          cell.state = { item, fresh: false };
          return cell.state;
        }),
      };
      this.entries.set(key, cell);
      entry = cell;
    }
    const cell = entry;
    const retain = () => {
      cell.users++;
      let released = false;
      return () => {
        if (!released) cell.users--;
        released = true;
      };
    };
    const release = retain();
    try {
      return { state: await cell.promise, source, release, retain };
    } catch (error) {
      release();
      if (this.entries.get(key) === cell) this.entries.delete(key);
      throw error;
    }
  }
}
