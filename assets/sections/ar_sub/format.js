// Number / text formatting utilities. Missing → "N/A".
export const NA = "N/A";

function isMissing(v) {
  return v === null || v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v));
}

export function txt(v) {
  if (isMissing(v)) return NA;
  return String(v);
}

export function fmtNumber(v, opts = {}) {
  if (isMissing(v)) return NA;
  const { decimals = 0, suffix = "" } = opts;
  return Number(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + suffix;
}

export const fmtIDR = (v) => fmtNumber(v, { decimals: 0, suffix: " bn" });
export const fmtHa = (v) => fmtNumber(v, { decimals: 0, suffix: " ha" });
export const fmtT = (v) => fmtNumber(v, { decimals: 0, suffix: " t" });

export function fmtPct(v) {
  if (isMissing(v)) return NA;
  return Number(v).toFixed(2) + "%";
}

export function fmtCompact(v) {
  if (isMissing(v)) return NA;
  return Number(v).toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}
