const USDC_DECIMALS = 6;

/**
 * Convert atomic USDC (6 decimals) to human-readable dollar string.
 *
 * @example
 * formatUsdc(1_500_000) // → "1.500000"
 * formatUsdc(50)        // → "0.000050"
 */
export function formatUsdc(atomic: number): string {
  return (atomic / 10 ** USDC_DECIMALS).toFixed(USDC_DECIMALS);
}

/**
 * Convert a dollar amount to atomic USDC (6 decimals).
 *
 * @example
 * parseUsdc("1.50") // → 1500000
 * parseUsdc(0.25)   // → 250000
 */
export function parseUsdc(dollars: string | number): number {
  return Math.round(Number(dollars) * 10 ** USDC_DECIMALS);
}
