export default function Loading() {
  return (
    <div className="mx-auto max-w-(--content-max-width) px-4 py-10 sm:px-6">
      <div className="h-8 w-64 animate-pulse rounded-md bg-secondary" />
      <div className="mt-5 flex gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-9 w-32 animate-pulse rounded-full bg-secondary" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border border-border">
            <div className="aspect-square animate-pulse bg-secondary" />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-4 w-full animate-pulse rounded bg-secondary" />
              <div className="h-6 w-20 animate-pulse rounded bg-secondary" />
              <div className="h-9 w-full animate-pulse rounded-md bg-secondary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
