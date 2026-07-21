import Link from "next/link";

export function CollectionTabs({ active }: { active: "collection" | "wishlist" }) {
  return (
    <nav className="collection-tabs" aria-label="Velg liste">
      <Link className={active === "collection" ? "active" : ""} href="/">
        <span aria-hidden="true">▦</span>
        Samlingen
      </Link>
      <Link className={active === "wishlist" ? "active" : ""} href="/wishlist">
        <span aria-hidden="true">♡</span>
        Ønskeliste
      </Link>
    </nav>
  );
}
