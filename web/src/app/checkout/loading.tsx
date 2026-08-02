export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse px-4 py-10 sm:px-6">
      <div className="h-7 w-32 rounded bg-secondary" />
      <div className="mt-6 flex flex-col gap-2">
        <div className="h-4 w-40 rounded bg-secondary" />
        <div className="h-16 w-full rounded-lg bg-secondary" />
        <div className="h-16 w-full rounded-lg bg-secondary" />
      </div>
      <div className="mt-6 h-24 w-full rounded-xl bg-secondary" />
      <div className="mt-6 h-11 w-full rounded-md bg-secondary" />
    </div>
  );
}
