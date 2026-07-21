import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getSupabaseAdmin } from "./supabase";

const bucket = "covers";

export async function uploadCoverAssets(buffer: Buffer, contentType: string) {
  const id = randomUUID();
  const year = new Date().getFullYear();
  const coverPath = `${year}/${id}.webp`;
  const thumbnailPath = `${year}/thumbs/${id}.webp`;

  const [coverBuffer, thumbnailBuffer] = await Promise.all([
    sharp(buffer)
      .rotate()
      .resize({ width: 1600, height: 2400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer(),
    sharp(buffer)
      .rotate()
      .resize({ width: 320, height: 480, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer(),
  ]);

  const supabase = getSupabaseAdmin();
  const coverUpload = await supabase.storage.from(bucket).upload(coverPath, coverBuffer, {
    contentType: "image/webp",
    upsert: false,
  });
  if (coverUpload.error) throw new Error(coverUpload.error.message);

  const thumbnailUpload = await supabase.storage.from(bucket).upload(thumbnailPath, thumbnailBuffer, {
    contentType: "image/webp",
    upsert: false,
  });
  if (thumbnailUpload.error) {
    await supabase.storage.from(bucket).remove([coverPath]);
    throw new Error(thumbnailUpload.error.message);
  }

  const [coverSigned, thumbnailSigned] = await Promise.all([
    supabase.storage.from(bucket).createSignedUrl(coverPath, 3600),
    supabase.storage.from(bucket).createSignedUrl(thumbnailPath, 3600),
  ]);

  return {
    coverPath,
    thumbnailPath,
    coverUrl: coverSigned.data?.signedUrl ?? null,
    thumbnailUrl: thumbnailSigned.data?.signedUrl ?? null,
    sourceContentType: contentType,
  };
}

export async function removeCoverAssets(paths: Array<string | null | undefined>) {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (!unique.length) return null;
  const { error } = await getSupabaseAdmin().storage.from(bucket).remove(unique);
  return error?.message ?? null;
}
