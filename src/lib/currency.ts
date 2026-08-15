/**
 * Multi-currency GROUNDWORK ONLY -- not a full conversion/payments system.
 *
 * Every amount in the database (settlements.gross_revenue, platform_fee,
 * amount_paid, etc.) is stored in PKR, the platform's base currency. A
 * vendor's `currency` column is purely a *display* preference: we divide the
 * PKR amount by that currency's `rate_to_pkr` (from `currency_rates`, seeded
 * with placeholder rates -- see that table's comment) to show an
 * approximate figure in the vendor's preferred currency. This is NOT a real
 * FX conversion pipeline: rates are static until someone wires up a real
 * feed, and no money actually moves in anything but PKR.
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "Rs ",
  USD: "$",
  AED: "AED ",
  SAR: "SAR ",
};

export type CurrencyRate = { currency: string; rate_to_pkr: number };

export function formatInCurrency(amountPkr: number, currency: string, rates: CurrencyRate[]): string {
  if (currency === "PKR") {
    return "Rs " + Math.round(amountPkr).toLocaleString("en-PK");
  }
  const rate = rates.find((r) => r.currency === currency)?.rate_to_pkr;
  if (!rate || rate <= 0) {
    // No rate on file -- fall back to PKR rather than showing a wrong number.
    return "Rs " + Math.round(amountPkr).toLocaleString("en-PK");
  }
  const converted = amountPkr / rate;
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return symbol + converted.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}
