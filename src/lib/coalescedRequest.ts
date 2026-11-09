export type CoalescedAsyncTask = () => void | Promise<void>;

/**
 * Runs at most one task at a time. Concurrent refresh requests are coalesced into
 * one trailing execution using the most recently requested task.
 */
export class CoalescedRequestRunner {
  private activePromise: Promise<void> | null = null;
  private queuedTask: CoalescedAsyncTask | null = null;

  run(task: CoalescedAsyncTask): Promise<void> {
    if (this.activePromise) {
      this.queuedTask = task;
      return this.activePromise;
    }

    const execution = Promise.resolve().then(() => this.drain(task));
    const tracked = execution.finally(() => {
      if (this.activePromise === tracked) this.activePromise = null;
    });
    this.activePromise = tracked;
    return tracked;
  }

  private async drain(firstTask: CoalescedAsyncTask): Promise<void> {
    let task: CoalescedAsyncTask | null = firstTask;
    let firstError: unknown;
    let failed = false;

    while (task) {
      try {
        await task();
      } catch (error) {
        if (!failed) firstError = error;
        failed = true;
      }
      // Take the latest queued refresh only after the current task finishes.
      // Clearing it before the first task would discard calls queued before its microtask starts.
      task = this.queuedTask;
      this.queuedTask = null;
    }

    if (failed) throw firstError;
  }
}
