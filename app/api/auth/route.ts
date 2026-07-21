import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  makeWriteCookie,
  writeCookieName,
} from "@/lib/write-auth";

const WRITE_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ugyldig forespørsel" },
      { status: 400 },
    );
  }

  const token =
    typeof body === "object" &&
    body !== null &&
    "token" in body
      ? (body as { token?: unknown }).token
      : undefined;

  const expectedToken = process.env.APP_WRITE_TOKEN;

  if (
    !expectedToken ||
    typeof token !== "string" ||
    token.length !== expectedToken.length ||
    !timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expectedToken),
    )
  ) {
    return NextResponse.json(
      { error: "Feil skrivetoken" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(
    writeCookieName,
    makeWriteCookie(),
    {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: WRITE_ACCESS_MAX_AGE_SECONDS,
    },
  );

  return response;
}