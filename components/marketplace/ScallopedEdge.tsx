/**
 * Retired: headers now end in a clean rounded edge instead of scallops.
 * Kept as a no-op so existing imports keep working.
 */
type ScallopedEdgeProps = {
  color?: string;
  count?: number;
  size?: number;
  edge?: "top" | "bottom";
  zIndex?: number;
};

export function ScallopedEdge(_props: ScallopedEdgeProps) {
  return null;
}
