import { CategoryCard } from "../components/CategoryCard";
import { HeroBanner } from "../components/HeroBanner";
import { NewArrivalsBanner } from "../components/NewArrivalsBanner";
import { PromoBanner } from "../components/PromoBanner";
import { ProductCard } from "../components/ProductCard";
import { TrustSection } from "../components/TrustSection";
import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";
import styles from "./Home.module.css";

const CURATED_SECTION_LIMIT = 8;

export function Home() {
  const { data: products } = useProducts();
  const { data: categories } = useCategories();

  const discountedProducts = (products ?? []).filter(
    (product) => product.discountCents !== null && product.discountCents > 0
  );
  const recentProducts = (products ?? []).slice(-CURATED_SECTION_LIMIT).reverse();

  return (
    <div>
      <HeroBanner />

      {categories && categories.length > 0 && (
        <section className={`container ${styles.section}`}>
          <h2 className={styles.heading}>Categorias</h2>
          <div className={styles.categoryGrid}>
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>
      )}

      {discountedProducts.length > 0 && (
        <section className={`container ${styles.section}`}>
          <PromoBanner promotions={discountedProducts} />
          <div className={styles.productGrid}>
            {discountedProducts.slice(0, CURATED_SECTION_LIMIT).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {recentProducts.length > 0 && (
        <section className={`container ${styles.section}`}>
          <NewArrivalsBanner />
          <div className={styles.productGrid}>
            {recentProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <TrustSection />
    </div>
  );
}
