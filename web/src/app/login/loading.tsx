export default function LoginLoading() {
  return (
    <div className="mx-auto flex max-w-(--content-max-width) justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-sm animate-pulse rounded-xl border border-border bg-card p-8">
        <div className="mx-auto h-5 w-40 rounded bg-secondary" />
        <div className="mx-auto mt-3 h-4 w-full rounded bg-secondary" />
        <div className="mx-auto mt-1 h-4 w-2/3 rounded bg-secondary" />
        <div className="mt-6 h-11 w-full rounded-md bg-secondary" />
      </div>
    </div>
  );
}
