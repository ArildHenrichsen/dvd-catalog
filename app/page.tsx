import { CollectionTabs } from "@/components/collection-tabs";
import { ReleaseListing } from "@/components/release-listing";
import { QuickCheckLauncher } from "@/components/quick-check-launcher";

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
        <QuickCheckLauncher />
      </div>
      <ReleaseListing params={params} wishlist={false} />
    </>
  );
}
