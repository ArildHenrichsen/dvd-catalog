import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("SUPABASE_URL og SUPABASE_SECRET_KEY må finnes i miljøet");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: releases, error } = await supabase
  .from("releases")
  .select("id,cover_path,thumbnail_path")
  .not("cover_path", "is", null)
  .is("thumbnail_path", null);
if (error) throw error;

console.log(`Fant ${releases.length} covere uten thumbnail.`);
for (const [index, release] of releases.entries()) {
  const downloaded = await supabase.storage.from("covers").download(release.cover_path);
  if (downloaded.error || !downloaded.data) {
    console.error(`Hoppet over ${release.id}:`, downloaded.error?.message);
    continue;
  }
  const thumbnail = await sharp(Buffer.from(await downloaded.data.arrayBuffer()))
    .rotate()
    .resize({ width: 320, height: 480, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();
  const thumbnailPath = `${new Date().getFullYear()}/thumbs/${randomUUID()}.webp`;
  const uploaded = await supabase.storage.from("covers").upload(thumbnailPath, thumbnail, { contentType: "image/webp", upsert: false });
  if (uploaded.error) {
    console.error(`Hoppet over ${release.id}:`, uploaded.error.message);
    continue;
  }
  const updated = await supabase.from("releases").update({ thumbnail_path: thumbnailPath }).eq("id", release.id);
  if (updated.error) {
    await supabase.storage.from("covers").remove([thumbnailPath]);
    console.error(`Hoppet over ${release.id}:`, updated.error.message);
    continue;
  }
  console.log(`${index + 1}/${releases.length}: ${release.id}`);
}
console.log("Ferdig.");
