import { PageLoader, SkeletonCard } from "@/components/ui/loading";

export default function AdminLoading() {
  return (
    <main className="container-shell py-10">
      <PageLoader label="Loading admin panel" />
      <div className="grid gap-4 md:grid-cols-4">
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
      </div>
    </main>
  );
}
