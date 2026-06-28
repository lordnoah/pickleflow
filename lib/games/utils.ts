import { Player } from '../../types';

/** Standard Fisher-Yates shuffle algorithm */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Generates a consistent, sorted key for tracking a pair of player IDs */
export function getPartnerKey(p1: Player, p2: Player): string {
  return `${Math.min(p1.id, p2.id)}-${Math.max(p1.id, p2.id)}`;
}

/** Updates the partner history counts for both teams in a match */
export function updatePartnerHistory(
  history: Record<string, number>,
  t1: Player[],
  t2: Player[],
): void {
  if (t1.length >= 2) {
    const k1 = getPartnerKey(t1[0], t1[1]);
    history[k1] = (history[k1] || 0) + 1;
  }
  if (t2.length >= 2) {
    const k2 = getPartnerKey(t2[0], t2[1]);
    history[k2] = (history[k2] || 0) + 1;
  }
}

/** Pick the best pairing from a 4-player group minimizing repeat partnerships */
export function bestPairing(
  group: Player[],
  partnerHistory: Record<string, number>,
): { t1: Player[]; t2: Player[] } {
  const getH = (p1: Player, p2: Player) => partnerHistory[getPartnerKey(p1, p2)] || 0;

  const options = [
    { t1: [group[0], group[1]], t2: [group[2], group[3]] },
    { t1: [group[0], group[2]], t2: [group[1], group[3]] },
    { t1: [group[0], group[3]], t2: [group[1], group[2]] },
  ];

  return options.sort(
    (a, b) =>
      getH(a.t1[0], a.t1[1]) +
      getH(a.t2[0], a.t2[1]) -
      (getH(b.t1[0], b.t1[1]) + getH(b.t2[0], b.t2[1])),
  )[0];
}
