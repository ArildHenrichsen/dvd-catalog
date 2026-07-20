import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { releaseSchema } from "@/lib/validation";
import { hasWriteAccess } from "@/lib/write-auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  if (!(await hasWriteAccess())) {
    return NextResponse.json(
      { error: "Skrivetilgang kreves" },
      { status: 401 },
    );
  }

  const { id } = await params;

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ugyldig JSON-data" },
      { status: 400 },
    );
  }

  const parsed = releaseSchema.safeParse(requestBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Ugyldige data",
      },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  // Hent eksisterende coverreferanse før posten oppdateres.
  const {
    data: existingRelease,
    error: readError,
  } = await supabase
    .from("releases")
    .select("cover_path")
    .eq("id", id)
    .single();

  if (readError) {
    return NextResponse.json(
      { error: readError.message },
      { status: 500 },
    );
  }

  const oldCoverPath =
    existingRelease?.cover_path ?? null;

  const newCoverPath =
    parsed.data.cover_path ?? null;

  const { error: updateError } = await supabase
    .from("releases")
    .update(parsed.data)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  let coverWarning: string | null = null;

  // Rydd bare hvis coverreferansen faktisk er endret.
  if (
    oldCoverPath &&
    oldCoverPath !== newCoverPath
  ) {
    const {
      count,
      error: countError,
    } = await supabase
      .from("releases")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("cover_path", oldCoverPath);

    if (countError) {
      // Behold filen dersom vi ikke sikkert kan fastslå
      // at ingen andre poster bruker den.
      coverWarning =
        "DVD-en ble oppdatert, men gammelt cover " +
        `kunne ikke kontrolleres: ${countError.message}`;
    } else if ((count ?? 0) === 0) {
      const { error: storageError } =
        await supabase.storage
          .from("covers")
          .remove([oldCoverPath]);

      if (storageError) {
        coverWarning =
          "DVD-en ble oppdatert, men gammelt cover " +
          `kunne ikke slettes: ${storageError.message}`;
      }
    }
  }

  return NextResponse.json({
    id,
    coverWarning,
  });
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  if (!(await hasWriteAccess())) {
    return NextResponse.json(
      { error: "Skrivetilgang kreves" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // Hent coverreferansen før databaseposten slettes.
  const {
    data: release,
    error: readError,
  } = await supabase
    .from("releases")
    .select("cover_path")
    .eq("id", id)
    .single();

  if (readError) {
    return NextResponse.json(
      { error: readError.message },
      { status: 500 },
    );
  }

  const { error: deleteError } = await supabase
    .from("releases")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 },
    );
  }

  let coverWarning: string | null = null;

  if (release?.cover_path) {
    // Kontroller om andre DVD-poster fortsatt bruker coveret.
    const {
      count,
      error: countError,
    } = await supabase
      .from("releases")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("cover_path", release.cover_path);

    if (countError) {
      // Behold coveret hvis referansesjekken feiler.
      coverWarning =
        "DVD-en ble slettet, men coverreferanser " +
        `kunne ikke kontrolleres: ${countError.message}`;
    } else if ((count ?? 0) === 0) {
      const { error: storageError } =
        await supabase.storage
          .from("covers")
          .remove([release.cover_path]);

      if (storageError) {
        coverWarning =
          "DVD-en ble slettet, men coverfilen " +
          `kunne ikke slettes: ${storageError.message}`;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    coverWarning,
  });
}