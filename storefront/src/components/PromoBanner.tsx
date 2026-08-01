import { Link } from "react-router-dom";
import { usePrimaryProductImage } from "../hooks/useProductImages";
import { discountPercentage } from "../lib/money";
import type { ProductOutput } from "../types/api";
import { WaveDivider } from "./WaveDivider";
import styles from "./PromoBanner.module.css";

export function PromoBanner({ promotions }: { promotions: ProductOutput[] }) {
  const featuredProduct = promotions[0];
  const featuredImageUrl = usePrimaryProductImage(featuredProduct?.id ?? "");

  const maxDiscountPercentage = promotions.reduce(
    (max, product) => Math.max(max, discountPercentage(product.priceCents, product.discountCents)),
    0
  );

  return (
    <section className={styles.banner}>
      <div className={styles.content}>
        <p className={styles.headlineRed}>Promoções</p>
        <p className={styles.headlineDark}>da semana</p>
        <p className={styles.subtext}>Cuidado com sua saúde por um preço ainda melhor. Aproveite enquanto durar o estoque.</p>
      </div>

      <div className={styles.badge}>
        <span className={styles.badgePrefix}>Até</span>
        <strong className={styles.badgeValue}>{maxDiscountPercentage}% OFF</strong>
      </div>

      {featuredImageUrl && (
        <img className={styles.productPhoto} src={featuredImageUrl} alt="" aria-hidden="true" />
      )}

      <WaveDivider position="bottom" className={styles.wave} />

      <Link to="/produtos" className={styles.cta}>
        Ver ofertas
      </Link>
    </section>
  );
}
