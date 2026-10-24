type VisitStorage = Pick<Storage, "getItem" | "setItem">;
const VISIT_KEY = "office:crate-walkthrough-seen";

/** One short browsing demonstration per browser visit. Times are seconds. */
export class CrateWalkthrough {
  private seen = false;
  private startedAt: number | null = null;
  private furthest = 0;

  get active(): boolean { return this.startedAt !== null; }

  begin(count: number, reduced: boolean, now: number, storage?: VisitStorage): boolean {
    if (this.seen) return false;
    this.seen = true;
    try {
      if (storage?.getItem(VISIT_KEY) === "1") return false;
      storage?.setItem(VISIT_KEY, "1");
    } catch {
      // With storage blocked, the mounted office still remembers this visit.
    }
    if (reduced || count < 2) return false;
    this.furthest = Math.min(2, count - 1);
    this.startedAt = now;
    return true;
  }

  sample(now: number): { dig: number | null; offset: number } {
    if (this.startedAt === null) return { dig: null, offset: 0 };
    const progress = Math.max(0, (now - this.startedAt) / 2.2);
    if (progress >= 1) {
      this.cancel();
      return { dig: 0, offset: 0 };
    }
    const steps = [0, 1, this.furthest, 1, 0];
    return { dig: steps[Math.min(4, Math.floor(progress * 5))], offset: -72 * Math.sin(Math.PI * progress) };
  }

  /** Hand control over without moving the record the visitor is about to use. */
  cancel(): void { this.startedAt = null; }
}
