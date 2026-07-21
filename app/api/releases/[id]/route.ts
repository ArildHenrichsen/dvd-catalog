import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { releaseSchema } from "@/lib/validation";
import { hasWriteAccess } from "@/lib/write-auth";
import { removeCoverAssets } from "@/lib/covers";

type RouteContext = { params: Promise<{ id: string }> };

async function pathIsReferenced(path: string, excludedId?: string) {
  let query = getSupabaseAdmin().from("releases").select("id", { count: "exact", head: true })
    .or(`cover_path.eq.${path},thumbnail_path.eq.${path}`);
  if (excludedId) query = query.neq("id", excludedId);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await hasWriteAccess())) return NextResponse.json({ error: "Skrivetilgang kreves" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = releaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ugyldige data" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing, error: readError } = await supabase
    .from("releases")
    .select("cover_path,thumbnail_path")
    .eq("id", id)
    .single();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

  const { error: updateError } = await supabase.from("releases").update(parsed.data).eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const oldPaths = [existing?.cover_path, existing?.thumbnail_path].filter((p): p is string => Boolean(p));
  const newPaths = new Set([parsed.data.cover_path, parsed.data.thumbnail_path].filter(Boolean));
  const removable: string[] = [];
  let coverWarning: string | null = null;
  try {
    for (const path of oldPaths) {
      if (!newPaths.has(path) && !(await pathIsReferenced(path, id))) removable.push(path);
    }
    coverWarning = await removeCoverAssets(removable);
  } catch (error) {
    coverWarning = error instanceof Error ? error.message : "Kunne ikke rydde gamle coverfiler";
  }

  return NextResponse.json({ id, coverWarning });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await hasWriteAccess())) return NextResponse.json({ error: "Skrivetilgang kreves" }, { status: 401 });
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: release, error: readError } = await supabase.from("releases").select("cover_path,thumbnail_path").eq("id", id).single();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  const { error: deleteError } = await supabase.from("releases").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  const candidates = [release?.cover_path, release?.thumbnail_path].filter((p): p is string => Boolean(p));
  const removable: string[] = [];
  let coverWarning: string | null = null;
  try {
    for (const path of candidates) if (!(await pathIsReferenced(path))) removable.push(path);
    coverWarning = await removeCoverAssets(removable);
  } catch (error) {
    coverWarning = error instanceof Error ? error.message : "Kunne ikke rydde coverfiler";
  }
  return NextResponse.json({ ok: true, coverWarning });
}
