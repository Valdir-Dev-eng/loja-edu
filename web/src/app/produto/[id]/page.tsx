import Link from "next/link";
import { ProductGallery } from "@/components/product-gallery";
import { ProductBuyBox } from "@/components/product-buy-box";
import { getProduct, getProductImages } from "@/lib/data";

interface ProdutoPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProdutoPage({ params }: ProdutoPageProps) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return (
      <div className="mx-auto flex max-w-(--content-max-width) flex-col items-center gap-3 px-6 py-24 text-center">
        <p className="text-muted-foreground">Produto não encontrado.</p>
        <Link href="/produtos" className="font-bold text-brand-red">
          Ver todos os produtos
        </Link>
      </div>
    );
  }

  const images = await getProductImages(id);
  const orderedImages = [...images].sort((a, b) => a.order - b.order);

  return (
    <div className="mx-auto max-w-(--content-max-width) px-4 py-8 sm:px-6">
      <div className="grid gap-8 md:grid-cols-[minmax(260px,440px)_1fr]">
        <ProductGallery productName={product.name} images={images} />

        <div className="flex flex-col gap-5">
          <h1 className="font-sans text-2xl font-extrabold">{product.name}</h1>
          <ProductBuyBox product={product} activeImageUrl={orderedImages[0]?.url ?? null} />
        </div>
      </div>
    </div>
  );
}
