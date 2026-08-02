import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getCategories, getPrimaryProductImageUrl, getProducts } from "@/lib/data";
import { cn } from "@/lib/utils";

interface ProdutosPageProps {
  searchParams: Promise<{ busca?: string; categoria?: string }>;
}

export default async function ProdutosPage({ searchParams }: ProdutosPageProps) {
  const { busca = "", categoria = "" } = await searchParams;

  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  const filtered = products.filter((product) => {
    const matchesSearch = busca ? product.name.toLowerCase().includes(busca.toLowerCase()) : true;
    const matchesCategory = categoria ? product.categoryId === categoria : true;
    return matchesSearch && matchesCategory;
  });

  const filteredWithImages = await Promise.all(
    filtered.map(async (product) => ({
      product,
      imageUrl: await getPrimaryProductImageUrl(product.id),
    }))
  );

  return (
    <div className="mx-auto max-w-(--content-max-width) px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">
        {busca ? `Resultados para "${busca}"` : "Todos os produtos"}
      </h1>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/produtos"
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-semibold",
            !categoria ? "border-brand-red bg-brand-red-light text-brand-red" : "border-border text-foreground"
          )}
        >
          Todas as categorias
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/produtos?categoria=${category.id}`}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold",
              categoria === category.id
                ? "border-brand-red bg-brand-red-light text-brand-red"
                : "border-border text-foreground"
            )}
          >
            {category.name}
          </Link>
        ))}
      </div>

      {filteredWithImages.length === 0 && (
        <p className="mt-10 text-muted-foreground">Nenhum produto encontrado com esses filtros.</p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredWithImages.map(({ product, imageUrl }) => (
          <ProductCard key={product.id} product={product} imageUrl={imageUrl} />
        ))}
      </div>
    </div>
  );
}
