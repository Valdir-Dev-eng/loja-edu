import { Link } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { finalPriceCents, formatCentsToBRL } from "../lib/money";
import styles from "./Cart.module.css";

export function Cart() {
  const { items, subtotalCents, updateQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className={`container ${styles.page}`}>
        <p className={styles.empty}>Seu carrinho está vazio.</p>
        <Link to="/produtos" className={styles.continueLink}>
          Continuar comprando
        </Link>
      </div>
    );
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Meu carrinho</h1>

      <ul className={styles.list}>
        {items.map((item) => {
          const unitPrice = finalPriceCents(item.priceCents, item.discountCents);
          return (
            <li key={item.productId} className={styles.item}>
              <div className={styles.imageFrame}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} />
                ) : (
                  <span className={styles.imagePlaceholder} aria-hidden="true">
                    {item.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className={styles.info}>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.unitPrice}>{formatCentsToBRL(unitPrice)} / un.</span>

                <div className={styles.quantityStepper}>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    aria-label="Diminuir quantidade"
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, Math.min(item.quantity + 1, item.stock))}
                    aria-label="Aumentar quantidade"
                    disabled={item.quantity >= item.stock}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={styles.itemTotals}>
                <span className={styles.itemSubtotal}>{formatCentsToBRL(unitPrice * item.quantity)}</span>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => removeItem(item.productId)}
                >
                  Remover
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className={styles.summary}>
        <span className={styles.summaryLabel}>Subtotal</span>
        <span className={styles.summaryValue}>{formatCentsToBRL(subtotalCents)}</span>
      </div>

      <Link to="/checkout" className={styles.checkoutButton}>
        Continuar para o checkout
      </Link>
    </div>
  );
}
