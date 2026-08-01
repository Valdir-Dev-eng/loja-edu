import { Link } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { usePrimaryProductImage } from "../hooks/useProductImages";
import { discountPercentage, finalPriceCents, formatCentsToBRL } from "../lib/money";
import type { ProductOutput } from "../types/api";
import styles from "./ProductCard.module.css";

export function ProductCard({ product }: { product: ProductOutput }) {
  const imageUrl = usePrimaryProductImage(product.id);
  const { addItem } = useCart();
  const percentage = discountPercentage(product.priceCents, product.discountCents);
  const finalPrice = finalPriceCents(product.priceCents, product.discountCents);
  const outOfStock = product.stock <= 0;

  function handleAdd() {
    addItem({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      discountCents: product.discountCents,
      stock: product.stock,
      imageUrl,
    });
  }

  return (
    <article className={styles.card}>
      <Link to={`/produto/${product.id}`} className={styles.imageLink}>
        <div className={styles.imageFrame}>
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} loading="lazy" />
          ) : (
            <span className={styles.imagePlaceholder} aria-hidden="true">
              {product.name.charAt(0).toUpperCase()}
            </span>
          )}
          {percentage > 0 && <span className={styles.discountBadge}>-{percentage}%</span>}
        </div>
      </Link>

      <div className={styles.body}>
        <Link to={`/produto/${product.id}`} className={styles.name}>
          {product.name}
        </Link>

        <div className={styles.priceRow}>
          {percentage > 0 && <span className={styles.oldPrice}>{formatCentsToBRL(product.priceCents)}</span>}
          <span className={styles.price}>{formatCentsToBRL(finalPrice)}</span>
        </div>

        <span className={styles.stock}>{product.stock} em estoque</span>

        <button className={styles.addButton} onClick={handleAdd} disabled={outOfStock}>
          {outOfStock ? "Sem estoque" : "Adicionar"}
        </button>
      </div>
    </article>
  );
}
