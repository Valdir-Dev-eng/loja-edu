import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { useNotifications } from "../hooks/useNotifications";
import { usePrimaryProductImage } from "../hooks/useProductImages";
import { discountPercentage, finalPriceCents, formatCentsToBRL } from "../lib/money";
import type { ProductOutput } from "../types/api";
import styles from "./ProductCard.module.css";

export function ProductCard({ product }: { product: ProductOutput }) {
  const imageUrl = usePrimaryProductImage(product.id);
  const { addItem } = useCart();
  const { notify } = useNotifications();
  const [added, setAdded] = useState(false);
  const percentage = discountPercentage(product.priceCents, product.discountCents);
  const finalPrice = finalPriceCents(product.priceCents, product.discountCents);
  const outOfStock = product.stock <= 0;

  function handleAdd() {
    const result = addItem({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      discountCents: product.discountCents,
      stock: product.stock,
      imageUrl,
    });

    if (result.addedQuantity > 0) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      notify({ type: "success", title: "Adicionado ao carrinho", message: product.name });
    } else {
      notify({
        type: "warning",
        title: "Limite de estoque atingido",
        message: `Você já tem no carrinho todo o estoque disponível de "${product.name}".`,
      });
    }
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

        <span className={styles.stock}>
          <span className={outOfStock ? styles.stockDotEmpty : styles.stockDot} aria-hidden="true" />
          {outOfStock ? "Sem estoque" : `${product.stock} em estoque`}
        </span>

        <button className={styles.addButton} onClick={handleAdd} disabled={outOfStock}>
          {outOfStock ? "Sem estoque" : added ? "Adicionado ✓" : "Adicionar ao carrinho"}
        </button>
      </div>
    </article>
  );
}
