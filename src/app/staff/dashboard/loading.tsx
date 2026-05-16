import { PageLoader, SkeletonCard } from "@/components/ui/loading";

export default function StaffDashboardLoading() {
  return (
    <main className="container-shell py-10">
      <PageLoader label="Loading staff dashboard" />
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </main>
  );
}
