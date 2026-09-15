export type CartFlightPath = {
  fromX: number; fromY: number; toX: number; toY: number;
  controlX: number; controlY: number;
};

/** The same path runs backwards from its current progress on a failed write. */
export function cartFlightPosition(path: CartFlightPath, progress: number) {
  'worklet';
  const t = Math.max(0, Math.min(1, progress));
  const remaining = 1 - t;
  return {
    x: remaining * remaining * path.fromX + 2 * remaining * t * path.controlX + t * t * path.toX,
    y: remaining * remaining * path.fromY + 2 * remaining * t * path.controlY + t * t * path.toY,
    scale: 1 - t * 0.8,
  };
}
