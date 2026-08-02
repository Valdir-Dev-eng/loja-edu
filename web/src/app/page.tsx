export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-(--content-max-width) flex-col items-center gap-3 px-6 py-24 text-center">
      <h1 className="font-sans text-3xl font-extrabold text-brand-red sm:text-4xl">
        Sorocaba merece esse cuidado
      </h1>
      <p className="max-w-md text-muted-foreground">
        Casca do novo frontend no ar — Home de verdade (SSR, hero, produtos)
        chega na próxima fase.
      </p>
    </div>
  );
}
