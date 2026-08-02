import { CategoryCard } from "../components/CategoryCard";
import { HeroBanner } from "../components/HeroBanner";
import { PromoBanner } from "../components/PromoBanner";
import { ProductCard } from "../components/ProductCard";
import { TrustSection } from "../components/TrustSection";
import { useCategories } from "../hooks/useCategories";
import { useProductsWithImages } from "../hooks/useProductImages";
import { useProducts } from "../hooks/useProducts";
import styles from "./Home.module.css";

const CURATED_SECTION_LIMIT = 8;

export function Home() {
  const { data: products } = useProducts();
  const { data: categories } = useCategories();
  const productsWithImages = useProductsWithImages(products ?? []);

  const discountedProducts = productsWithImages.filter(
    (product) => product.discountCents !== null && product.discountCents > 0
  );
  const recentProducts = productsWithImages.slice(-CURATED_SECTION_LIMIT).reverse();

  return (
    <div>
      <HeroBanner />

      {categories && categories.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <h2 className={styles.heading}>Compre por categoria</h2>
            <div className={styles.categoryGrid}>
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </div>
        </section>
      )}

      {discountedProducts.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <PromoBanner promotions={discountedProducts} />
            <div className={styles.productGrid}>
              {discountedProducts.slice(0, CURATED_SECTION_LIMIT).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {recentProducts.length > 0 && (
        <section className={styles.section}>
          <div className="container">
            <h2 className={styles.heading}>Lançamentos</h2>
            <div className={styles.productGrid}>
              {recentProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      <TrustSection />
    </div>
  );
}
