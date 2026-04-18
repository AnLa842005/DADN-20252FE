import { createHash } from "crypto";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function parseTtlSeconds(raw: string | undefined, fallbackSeconds: number): number {
  if (!raw) return fallbackSeconds;
  const trimmed = raw.trim();
  const m = trimmed.match(/^(\d+)\s*([smhd])$/i);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const mult =
      unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 60 * 60 : 60 * 60 * 24;
    return n * mult;
  }
  const asNum = Number(trimmed);
  return Number.isFinite(asNum) ? asNum : fallbackSeconds;
}

