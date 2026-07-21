"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SESSION_KEY = "dvd-quick-check-image";

async function compressForHandoff(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Kunne ikke klargjøre bildet");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function QuickCheckLauncher() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <label
      className={`button quick-camera-button${busy ? " is-busy" : ""}`}
      aria-label="Ta bilde og sjekk cover"
    >
      <span aria-hidden="true">📷</span>
      {busy ? "Klargjør …" : "Sjekk cover"}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
        disabled={busy}
        onChange={async event => {
          const file = event.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            const dataUrl = await compressForHandoff(file);
            sessionStorage.setItem(SESSION_KEY, dataUrl);
            router.push("/quick-check?camera=1");
          } catch {
            setBusy(false);
            inputRef.current?.click();
          }
        }}
      />
    </label>
  );
}
