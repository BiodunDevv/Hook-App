/** Coalesce checks, but never discard a publish/reconnect event during a fetch. */
export function createReleaseRefresh(task: () => Promise<void>, now = Date.now) {
  let running: Promise<void> | undefined;
  let pending = false;
  let stopped = false;
  let lastCheck = -Infinity;
  function check(force = false): Promise<void> {
    if (stopped) return Promise.resolve();
    if (running) { if (force) pending = true; return running; }
    if (!force && now() - lastCheck < 300_000) return Promise.resolve();
    running = (async () => {
      do {
        pending = false;
        lastCheck = now();
        await task();
      } while (pending && !stopped);
    })().finally(() => { running = undefined; });
    return running;
  }
  return { check, stop: () => { stopped = true; pending = false; } };
}
