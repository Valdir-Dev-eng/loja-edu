export default function Loading() {
  return (
    <div className="mx-auto max-w-(--content-max-width) px-4 py-8 sm:px-6">
      <div className="grid gap-8 md:grid-cols-[minmax(260px,440px)_1fr]">
        <div className="aspect-square animate-pulse rounded-xl bg-secondary" />
        <div className="flex flex-col gap-5">
          <div className="h-8 w-3/4 animate-pulse rounded bg-secondary" />
          <div className="h-56 animate-pulse rounded-xl bg-secondary" />
          <div className="h-32 animate-pulse rounded-xl bg-secondary" />
        </div>
      </div>
    </div>
  );
}
