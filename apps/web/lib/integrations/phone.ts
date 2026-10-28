// US/Canada national numbers and explicitly international E.164 input only.
// No last-ten-digits identity matching and no guessing a country for other national formats.
export function smsPhone(value: string | undefined): string | null {
  const input = (value ?? "").trim();
  if (!input || !/^\+?[\d ().-]+$/.test(input)) return null;
  const digits = input.replace(/\D/g, "");
  if (/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return `+1${digits}`;
  if (/^1[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return `+${digits}`;
  if (input.startsWith("+") && /^[2-9]\d{7,14}$/.test(digits)) return `+${digits}`;
  return null;
}
