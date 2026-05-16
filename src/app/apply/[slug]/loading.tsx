import { PageLoader, SkeletonCard } from "@/components/ui/loading";

export default function ApplyLoading() {
  return (
    <main className="container-shell py-10">
      <PageLoader label="Loading DigiConnect Dukan application form" />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <SkeletonCard rows={5} />
        <div className="grid gap-4">
          <SkeletonCard rows={2} />
          <SkeletonCard rows={4} />
        </div>
      </div>
    </main>
  );
}
