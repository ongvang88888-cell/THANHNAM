/** Money as integer minor units — never float. */
export function assertMinor(amount: number): number {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Amount must be a non-negative integer in minor units");
  }
  return amount;
}

export function formatMoney(amountMinor: number, currency: string): string {
  assertMinor(amountMinor);
  if (currency === "VND") {
    return `${amountMinor.toLocaleString("vi-VN")}₫`;
  }
  const major = amountMinor / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(major);
}
