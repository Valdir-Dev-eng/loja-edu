export function AccountLoading() {
  return (
    <div className="flex min-h-svh w-full animate-pulse">
      <div className="hidden w-[260px] shrink-0 border-r border-border bg-card p-4 sm:block">
        <div className="h-9 w-full rounded-md bg-secondary" />
        <div className="mt-6 flex flex-col gap-2">
          <div className="h-9 w-full rounded-md bg-secondary" />
          <div className="h-9 w-full rounded-md bg-secondary" />
          <div className="h-9 w-full rounded-md bg-secondary" />
        </div>
      </div>
      <div className="flex-1 p-6">
        <div className="h-6 w-48 rounded bg-secondary" />
        <div className="mt-4 h-32 w-full rounded-xl bg-secondary" />
        <div className="mt-4 h-32 w-full rounded-xl bg-secondary" />
      </div>
    </div>
  );
}
