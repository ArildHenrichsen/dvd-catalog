"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Release } from "@/lib/types";

export function ReleaseForm({ release, initial }: { release?: Release; initial?: Release }) {
  const defaults = release || initial;
  const router = useRouter();
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [coverPath,setCoverPath] = useState(defaults?.cover_path || "");
  const [preview,setPreview] = useState(defaults?.cover_url || "");

  async function upload(file: File) {
    setBusy(true); setError("");
    const body = new FormData(); body.append("file",file);
    const res = await fetch("/api/upload",{method:"POST",body});
    const json = await res.json();
    setBusy(false);
    if (!res.ok) throw new Error(json.error || "Opplasting feilet");
    setCoverPath(json.path); setPreview(json.url);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    payload.cover_path = coverPath;
    const url = release ? `/api/releases/${release.id}` : "/api/releases";
    const res = await fetch(url,{method:release?"PATCH":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    const json = await res.json(); setBusy(false);
    if (!res.ok) return setError(json.error || "Lagring feilet");
    router.push(`/releases/${json.id}`); router.refresh();
  }

  return <form className="form panel" onSubmit={submit}>
    {error && <p className="error" role="alert">{error}</p>}
    <label>Originaltittel<input name="original_title" required defaultValue={defaults?.original_title} /></label>
    <label>Alternativ tittel<input name="alternative_title" defaultValue={defaults?.alternative_title || ""} /></label>
    <div className="two-col"><label>Utgivelsesår<input name="release_year" type="number" min="1888" max={new Date().getFullYear()+1} defaultValue={defaults?.release_year || ""} /></label><label>IMDb-score<input name="imdb_score" type="number" min="0" max="10" step="0.1" defaultValue={defaults?.imdb_score ?? ""} /></label></div>
    <div className="two-col"><label>DVD-region<input name="region" defaultValue={defaults?.region || ""} /></label><label>Utgave / marked<input name="edition" defaultValue={defaults?.edition || ""} /></label></div>
    <label>Merknad<textarea name="notes" defaultValue={defaults?.notes || ""} /></label>
    <label>Cover<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={async e=>{const f=e.target.files?.[0]; if(f) try { setPreview(URL.createObjectURL(f)); await upload(f); } catch(err){setError(err instanceof Error?err.message:"Feil");}}} /></label>
    {preview && <div className="cover detail-cover"><img src={preview} alt="Forhåndsvisning av cover" /></div>}
    <button className="primary" disabled={busy}>{busy?"Arbeider…":release?"Lagre endringer":"Opprett DVD"}</button>
  </form>;
}
