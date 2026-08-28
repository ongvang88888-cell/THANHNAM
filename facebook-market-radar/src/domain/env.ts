export function marketingAccountId(raw: string | undefined): string {
  const trimmed = raw?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "act_demo";
}
