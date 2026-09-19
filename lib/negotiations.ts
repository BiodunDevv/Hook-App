/**
 * A negotiation counts as active when the backend still has it open *and* its
 * countdown has not elapsed — an "active" row whose expiresAt has passed is
 * effectively over, so it must not be counted. Shared by the Messages screen
 * and the tab badge so the two can never disagree.
 */
export type ActiveNegotiationRow = {
  status?: string;
  sessionMode?: "fixed" | "unlimited";
  expiresAt?: string;
};

export function isNegotiationActive(row: ActiveNegotiationRow, now: number = Date.now()) {
  if (row.status !== "active") return false;
  if (row.sessionMode === "unlimited" || !row.expiresAt) return true;
  return new Date(row.expiresAt).getTime() > now;
}

export function countActiveNegotiations(rows: ActiveNegotiationRow[] | undefined, now: number = Date.now()) {
  return (rows || []).filter((row) => isNegotiationActive(row, now)).length;
}
