export default function CustomerWalletLoading() {
  return (
    <main className="min-h-screen bg-[#f8fbff] px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl animate-pulse space-y-4">
        <div className="h-40 rounded-[1.5rem] bg-white" />
        <div className="grid gap-2.5 sm:grid-cols-3">
          <div className="h-24 rounded-2xl bg-white" />
          <div className="h-24 rounded-2xl bg-white" />
          <div className="h-24 rounded-2xl bg-white" />
        </div>
        <div className="h-80 rounded-[1.5rem] bg-white" />
      </div>
    </main>
  );
}
