import { NextResponse } from "next/server";
import { generateMovieNight } from "@/lib/theme-engine";

export async function GET() {
  try {
    const result = await generateMovieNight({ maxThemesToTest: 12 });

    // Include which Supabase env var is present (boolean flags only) when not in production.
    const envInfo = {
      nodeEnv: process.env.NODE_ENV ?? "development",
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSecretKey: !!process.env.SUPABASE_SECRET_KEY,
    };

    if ((process.env.NODE_ENV || "development") !== "production") {
      return NextResponse.json({ ...result, _env: envInfo });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("API /movie-night/generate feil:", e);
    return NextResponse.json({ success: false, message: "En feil oppstod ved generering av filmkveld." }, { status: 500 });
  }
}
