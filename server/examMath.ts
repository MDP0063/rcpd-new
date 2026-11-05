/**
 * Ganzzahlige Hilfsfunktionen für die Punkteberechnung (§19.6).
 * Es wird nirgends mit Fließkomma-Prozenten verglichen.
 */
import { BASIS_POINTS_FULL } from './examTypes.ts';

export function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Ganzzahldivision, kaufmännisch gerundet (halbe Einheiten aufwärts). Nur für num >= 0, den > 0. */
export function roundDivHalfUp(numerator: number, denominator: number): number {
  if (!isNonNegativeSafeInteger(numerator) || !isPositiveSafeInteger(denominator)) {
    throw new RangeError('roundDivHalfUp erwartet ganze Zahlen (Zähler >= 0, Nenner > 0).');
  }
  const n = BigInt(numerator);
  const d = BigInt(denominator);
  return Number((2n * n + d) / (2n * d));
}

/** Begrenzt auf 0..max. */
export function clampInt(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

/**
 * Bestehensvergleich ohne Fließkomma:
 * earnedPointsMilli * 10000 >= totalPossiblePointsMilli * passingScoreBasisPoints
 */
export function meetsPassingScore(
  earnedPointsMilli: number,
  totalPossiblePointsMilli: number,
  passingScoreBasisPoints: number
): boolean {
  if (
    !isNonNegativeSafeInteger(earnedPointsMilli) ||
    !isPositiveSafeInteger(totalPossiblePointsMilli) ||
    !isNonNegativeSafeInteger(passingScoreBasisPoints) ||
    passingScoreBasisPoints > BASIS_POINTS_FULL
  ) {
    return false;
  }
  return (
    BigInt(earnedPointsMilli) * BigInt(BASIS_POINTS_FULL) >=
    BigInt(totalPossiblePointsMilli) * BigInt(passingScoreBasisPoints)
  );
}

/** Ergebnis in Basispunkten (0..10000), gerundet. Nur für Anzeige und Mindestwerte, nicht für Bestehen. */
export function scoreBasisPoints(earnedPointsMilli: number, totalPossiblePointsMilli: number): number {
  if (totalPossiblePointsMilli <= 0) return 0;
  return clampInt(
    roundDivHalfUp(earnedPointsMilli * BASIS_POINTS_FULL, totalPossiblePointsMilli),
    BASIS_POINTS_FULL
  );
}

/** Ganze Prozentzahl für die Anzeige (halbe Prozent aufwärts), z. B. 7449 -> 74. */
export function formatPercent(basisPoints: number): number {
  return roundDivHalfUp(clampInt(basisPoints, BASIS_POINTS_FULL), 100);
}
