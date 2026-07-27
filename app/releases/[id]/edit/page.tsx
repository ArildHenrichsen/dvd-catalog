import Link from "next/link";
import { notFound } from "next/navigation";
import { ReleaseForm } from "@/components/release-form";
import { getRelease } from "@/lib/releases";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const release = await getRelease(id);

  if (!release) {
    notFound();
  }

  return (
    <article className="detail edit-release-page">
      <Link
        className="back-link"
        href={`/releases/${release.id}`}
      >
        ← Tilbake til {release.original_title}
      </Link>

      <header className="edit-release-heading">
        <span className="eyebrow">
          Rediger DVD
        </span>

        <span
          className={
            release.is_wishlist
              ? "wishlist-badge"
              : "collection-status-badge"
          }
        >
          {release.is_wishlist
            ? "♡ På ønskelisten"
            : "✓ I samlingen"}
        </span>

        <h1>{release.original_title}</h1>

        {release.alternative_title && (
          <p className="muted">
            {release.alternative_title}
          </p>
        )}
      </header>

      <ReleaseForm release={release} />
    </article>
  );
}