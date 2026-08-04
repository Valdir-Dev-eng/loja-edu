import { HeroBanner } from "@/components/hero-banner";
import { TrustSection } from "@/components/trust-section";
import { ProductCard } from "@/components/product-card";
import { getPrimaryProductImageUrl, getProducts } from "@/lib/data";
import type { ProductOutput } from "@/lib/api-types";
import { PostLoginRedirect } from "./post-login-redirect";

const CURATED_SECTION_LIMIT = 8;

async function withImages(products: ProductOutput[]) {
  return Promise.all(
    products.map(async (product) => ({
      product,
      imageUrl: await getPrimaryProductImageUrl(product.id),
    }))
  );
}

export default async function Home() {
  const products = await getProducts();

  const discounted = products.filter((product) => product.discountCents !== null && product.discountCents > 0);
  const recent = products.slice(-CURATED_SECTION_LIMIT).reverse();

  const [discountedWithImages, recentWithImages] = await Promise.all([
    withImages(discounted.slice(0, CURATED_SECTION_LIMIT)),
    withImages(recent),
  ]);

  return (
    <div>
      <PostLoginRedirect />
      <HeroBanner />
      <TrustSection />

      {discountedWithImages.length > 0 && (
        <section className="mx-auto max-w-(--content-max-width) px-4 pt-12 sm:px-6">
          <h2 className="mb-4 text-xl font-bold sm:text-2xl">Promoções</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {discountedWithImages.map(({ product, imageUrl }) => (
              <ProductCard key={product.id} product={product} imageUrl={imageUrl} />
            ))}
          </div>
        </section>
      )}

      {recentWithImages.length > 0 && (
        <section className="mx-auto max-w-(--content-max-width) px-4 pt-12 pb-16 sm:px-6">
          <h2 className="mb-4 text-xl font-bold sm:text-2xl">Lançamentos</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {recentWithImages.map(({ product, imageUrl }) => (
              <ProductCard key={product.id} product={product} imageUrl={imageUrl} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
