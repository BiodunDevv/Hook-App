/** Retired: headers now use a plain rounded edge; kept as a no-op so existing imports keep working. */
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
