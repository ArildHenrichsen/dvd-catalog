"use client";

import { useEffect, useRef } from "react";
import type { FocusEvent } from "react";

export function ExportMenu() {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const menu = menuRef.current;

      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      const menu = menuRef.current;

      if (event.key === "Escape" && menu?.open) {
        menu.open = false;
        menu.querySelector("summary")?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function closeOnBlur(event: FocusEvent<HTMLDetailsElement>) {
    if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
      event.currentTarget.open = false;
    }
  }

  return (
    <details ref={menuRef} className="export-menu" onBlur={closeOnBlur}>
      <summary className="button">
        Eksporter
        <span className="export-menu-chevron" aria-hidden="true">▾</span>
      </summary>
      <div className="export-submenu" role="menu" aria-label="Velg eksportformat">
        <a href="/api/export?format=csv" role="menuitem">
          <span aria-hidden="true">▦</span>
          CSV
        </a>
        <a href="/api/export?format=json" role="menuitem">
          <span aria-hidden="true">{"{}"}</span>
          JSON
        </a>
      </div>
    </details>
  );
}
