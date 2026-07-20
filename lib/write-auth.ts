import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "dvd_write_access";

function signature(value: string) {
  const secret = process.env.COOKIE_SIGNING_SECRET;
  if (!secret) throw new Error("COOKIE_SIGNING_SECRET mangler");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function makeWriteCookie() {
  const marker = "granted";
  return `${marker}.${signature(marker)}`;
}

export async function hasWriteAccess() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [marker, supplied] = raw.split(".");
  if (marker !== "granted" || !supplied) return false;
  const expected = signature(marker);
  if (supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export const writeCookieName = COOKIE;
