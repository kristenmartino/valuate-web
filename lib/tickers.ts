// SEC and Yahoo use a hyphen for share classes; accept the common dot alias.
export function normalizeTicker(raw: string): string {
  return raw.trim().toUpperCase().replaceAll(".", "-");
}

export function isValidTicker(raw: string): boolean {
  return /^[A-Z]{1,5}(?:-[A-Z])?$/.test(normalizeTicker(raw));
}
