/** Compare MongoDB / route ids reliably */
export function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

export function isMongoId(value) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}
