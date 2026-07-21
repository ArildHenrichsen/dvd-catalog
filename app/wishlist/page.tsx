import { CollectionTabs } from "@/components/collection-tabs";
import { ReleaseListing } from "@/components/release-listing";

export const metadata = {
  title: "Ønskeliste – DVD-samlingen",
};

export default async function WishlistPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <CollectionTabs active="wishlist" />
      <ReleaseListing params={params} wishlist />
    </>
  );
}
