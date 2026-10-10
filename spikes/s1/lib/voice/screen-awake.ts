export type ScreenAwakeStatus =
  | "off"
  | "requesting"
  | "active"
  | "released"
  | "unavailable"
  | "unsupported";

type ScreenLock = Pick<
  WakeLockSentinel,
  "released" | "release" | "addEventListener"
>;

// One visible-page lock; late grants after navigation/toggle-off are released.
// OS release is reported, never retried in a loop or allowed to alter playback.
export class ScreenAwake {
  private enabled = false;
  private epoch = 0;
  private pending = false;
  private lock: ScreenLock | null = null;

  constructor(
    private readonly request: (() => Promise<ScreenLock>) | undefined,
    private readonly visible: () => boolean,
    private readonly status: (value: ScreenAwakeStatus) => void,
  ) {}

  enable() {
    this.enabled = true;
    void this.acquire();
  }

  visibilityChanged() {
    if (this.visible()) {
      if (this.enabled) void this.acquire();
    } else {
      this.drop();
      if (this.enabled) this.status("released");
    }
  }

  disable() {
    this.enabled = false;
    this.drop();
    this.status("off");
  }

  private drop() {
    this.epoch++;
    this.pending = false;
    const lock = this.lock;
    this.lock = null;
    void lock?.release().catch(() => {});
  }

  private async acquire() {
    if (!this.enabled || !this.visible() || this.pending || this.lock) return;
    if (!this.request) {
      this.status("unsupported");
      return;
    }
    const epoch = this.epoch;
    this.pending = true;
    this.status("requesting");
    try {
      const lock = await this.request();
      if (epoch !== this.epoch || !this.enabled || !this.visible()) {
        await lock.release().catch(() => {});
        return;
      }
      if (lock.released) {
        this.status("released");
        return;
      }
      this.lock = lock;
      lock.addEventListener("release", () => {
        if (this.lock !== lock) return;
        this.lock = null;
        this.status(this.enabled ? "released" : "off");
      });
      this.status("active");
    } catch {
      if (epoch === this.epoch) this.status("unavailable");
    } finally {
      if (epoch === this.epoch) this.pending = false;
    }
  }
}
