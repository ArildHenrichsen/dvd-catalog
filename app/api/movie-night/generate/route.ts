import { NextResponse } from "next/server";
import { generateMovieNight } from "@/lib/theme-engine";

export async function GET() {
  try {
    const result = await generateMovieNight({ maxThemesToTest: 12 });
    return NextResponse.json(result);
  } catch (e) {
    console.error("API /movie-night/generate feil:", e);
    return NextResponse.json({ success: false, message: "En feil oppstod ved generering av filmkveld." }, { status: 500 });
  }
}
