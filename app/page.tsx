import Link from "next/link";
import { CollectionTabs } from "@/components/collection-tabs";
import { ReleaseListing } from "@/components/release-listing";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <div className="home-list-header">
        <CollectionTabs active="collection" />
        <Link className="button quick-camera-button" href="/quick-check">
          <span aria-hidden="true">📷</span>
          Sjekk cover
        </Link>
      </div>
      <ReleaseListing params={params} wishlist={false} />
    </>
  );
}
