"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Release } from "@/lib/types";

export function ReleaseActions({ release }: { release: Release }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function remove(){ setBusy(true); const res=await fetch(`/api/releases/${release.id}`,{method:"DELETE"}); const json=await res.json(); setBusy(false); if(!res.ok){setError(json.error||"Sletting feilet");return;} router.push("/"); router.refresh(); }
  function duplicate(){ const p=new URLSearchParams({duplicate:release.id}); router.push(`/releases/new?${p}`); }
  return <>
    <div className="actions"><Link className="button primary" href={`/releases/${release.id}/edit`}>Rediger</Link><button onClick={duplicate}>Dupliser</button><button className="danger" onClick={()=>dialog.current?.showModal()}>Slett</button></div>
    <dialog ref={dialog}><h2>Slett «{release.original_title}»?</h2><p>Handlingen kan ikke angres.</p>{error&&<p className="error">{error}</p>}<div className="actions"><button onClick={()=>dialog.current?.close()}>Avbryt</button><button className="danger" disabled={busy} onClick={remove}>{busy?"Sletter…":"Bekreft sletting"}</button></div></dialog>
  </>;
}
