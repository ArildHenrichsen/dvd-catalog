import { NextResponse } from "next/server";
import { releaseSchema } from "@/lib/validation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasWriteAccess } from "@/lib/write-auth";

export async function POST(req: Request) {
  if (!(await hasWriteAccess())) return NextResponse.json({ error: "Skrivetilgang kreves. Aktiver token via /unlock." }, { status: 401 });
  const parsed = releaseSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Ugyldige data" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const allowDuplicate = req.headers.get("x-allow-duplicate") === "true";
  if (!allowDuplicate) {
    const title = parsed.data.original_title.trim();
    const { data: matches, error: matchError } = await supabase
      .from("releases")
      .select("id,original_title,alternative_title,release_year,is_wishlist,edition,region")
      .ilike("original_title", title)
      .limit(10);
    if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 });
    if (matches?.length) {
      return NextResponse.json({ error: "Tittelen finnes allerede", code: "DUPLICATE_TITLE", matches }, { status: 409 });
    }
  }

  const { data, error } = await supabase.from("releases").insert(parsed.data).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
