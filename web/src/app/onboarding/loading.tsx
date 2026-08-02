export default function OnboardingLoading() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <div className="animate-pulse rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="h-5 w-52 rounded bg-secondary" />
        <div className="mt-3 h-4 w-3/4 rounded bg-secondary" />
        <div className="mt-6 flex flex-col gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-11 w-full rounded-md bg-secondary" />
          ))}
        </div>
      </div>
    </div>
  );
}
