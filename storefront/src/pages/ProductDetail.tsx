import { FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { useNotifications } from "../hooks/useNotifications";
import { useProduct } from "../hooks/useProducts";
import { useProductImages } from "../hooks/useProductImages";
import { api, ApiError } from "../lib/api";
import { discountPercentage, finalPriceCents, formatCentsToBRL } from "../lib/money";
import type { ShippingOption } from "../types/api";
import styles from "./ProductDetail.module.css";

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: productData, isLoading } = useProduct(id);
  const { data: images } = useProductImages(id ?? "");
  const { addItem } = useCart();
  const { notify } = useNotifications();

  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [postalCode, setPostalCode] = useState("");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[] | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  if (isLoading) {
    return <p className={`container ${styles.status}`}>Carregando produto...</p>;
  }

  if (!productData) {
    return (
      <div className={`container ${styles.status}`}>
        <p>Produto não encontrado.</p>
        <Link to="/produtos" className={styles.statusLink}>
          Ver todos os produtos
        </Link>
      </div>
    );
  }

  const product = productData;
  const percentage = discountPercentage(product.priceCents, product.discountCents);
  const finalPrice = finalPriceCents(product.priceCents, product.discountCents);
  const orderedImages = images ? [...images].sort((a, b) => a.order - b.order) : [];
  const activeImage = orderedImages[selectedImageIndex];
  const outOfStock = product.stock <= 0;

  async function handleCalculateShipping(event: FormEvent) {
    event.preventDefault();
    const cleanPostalCode = postalCode.replace(/\D/g, "");
    if (cleanPostalCode.length !== 8) {
      setShippingError("Informe um CEP com 8 dígitos.");
      return;
    }
    setShippingLoading(true);
    setShippingError(null);
    try {
      const options = await api.post<ShippingOption[]>("/shipping/quote", {
        destinationPostalCode: cleanPostalCode,
        items: [{ productId: product.id, quantity }],
      });
      setShippingOptions(options);
      if (options.length === 0) {
        notify({ type: "info", title: "Sem opções de frete", message: "Não há frete disponível para esse CEP." });
      }
    } catch (error) {
      setShippingOptions(null);
      const message = error instanceof ApiError ? error.body.error : "Não foi possível calcular o frete. Verifique sua conexão e tente novamente.";
      setShippingError(message);
      notify({ type: "error", title: "Erro ao calcular o frete", message });
    } finally {
      setShippingLoading(false);
    }
  }

  function handleAddToCart(): boolean {
    const result = addItem(
      {
        productId: product.id,
        name: product.name,
        priceCents: product.priceCents,
        discountCents: product.discountCents,
        stock: product.stock,
        imageUrl: activeImage?.url ?? null,
      },
      quantity
    );

    if (result.addedQuantity > 0) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      notify({ type: "success", title: "Adicionado ao carrinho", message: `${result.addedQuantity}x ${product.name}` });
      return true;
    }

    notify({
      type: "warning",
      title: "Limite de estoque atingido",
      message: `Você já tem no carrinho todo o estoque disponível de "${product.name}".`,
    });
    return false;
  }

  function handleBuyNow() {
    if (handleAddToCart()) {
      navigate("/carrinho");
    }
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.layout}>
        <div className={styles.gallery}>
          <div className={styles.mainImageFrame}>
            {activeImage ? (
              <img src={activeImage.url} alt={activeImage.altText ?? product.name} />
            ) : (
              <span className={styles.imagePlaceholder} aria-hidden="true">
                {product.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {orderedImages.length > 1 && (
            <div className={styles.thumbnails}>
              {orderedImages.map((image, index) => (
                <button
                  key={image.id}
                  className={`${styles.thumbnail} ${index === selectedImageIndex ? styles.thumbnailActive : ""}`}
                  onClick={() => setSelectedImageIndex(index)}
                  aria-label={`Ver imagem ${index + 1} de ${product.name}`}
                >
                  <img src={image.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.info}>
          <h1 className={styles.name}>{product.name}</h1>

          <div className={styles.buyBox}>
            <div className={styles.priceRow}>
              {percentage > 0 && <span className={styles.oldPrice}>{formatCentsToBRL(product.priceCents)}</span>}
              {percentage > 0 && <span className={styles.discountBadge}>-{percentage}%</span>}
            </div>
            <span className={styles.price}>{formatCentsToBRL(finalPrice)}</span>

            <p className={styles.stock}>
              <span className={outOfStock ? styles.stockDotEmpty : styles.stockDot} aria-hidden="true" />
              {outOfStock ? "Produto sem estoque no momento" : `${product.stock} em estoque`}
            </p>

            <div className={styles.quantityRow}>
              <span id="quantity-label">Quantidade</span>
              <div className={styles.quantityStepper}>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Diminuir quantidade"
                >
                  −
                </button>
                <p className={styles.quantityValue} aria-labelledby="quantity-label" aria-live="polite">
                  {quantity}
                </p>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  aria-label="Aumentar quantidade"
                >
                  +
                </button>
              </div>
            </div>

            {quantity > 1 && (
              <div className={styles.totalRow}>
                <span>Total</span>
                <span className={styles.totalValue}>{formatCentsToBRL(finalPrice * quantity)}</span>
              </div>
            )}

            <div className={styles.ctaGroup}>
              <button className={styles.buyNowButton} onClick={handleBuyNow} disabled={outOfStock}>
                Comprar agora
              </button>
              <button className={styles.addButton} onClick={handleAddToCart} disabled={outOfStock}>
                {added ? "Adicionado ✓" : "Adicionar ao carrinho"}
              </button>
            </div>
          </div>

          <div className={styles.shippingBox}>
            <h2 className={styles.shippingTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 7H14V17H3V7Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 10H18L21 13V17H14V10Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle cx="7.5" cy="18.5" r="1.6" stroke="currentColor" strokeWidth="2" />
                <circle cx="17.5" cy="18.5" r="1.6" stroke="currentColor" strokeWidth="2" />
              </svg>
              Calcular frete e prazo
            </h2>
            <form className={styles.shippingForm} onSubmit={handleCalculateShipping}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="00000-000"
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
                maxLength={9}
                aria-label="CEP de entrega"
              />
              <button type="submit" disabled={shippingLoading}>
                {shippingLoading ? "Calculando..." : "Calcular"}
              </button>
            </form>

            {shippingError && <p className={styles.shippingError}>{shippingError}</p>}

            {shippingOptions && shippingOptions.length === 0 && (
              <p className={styles.shippingError}>Nenhuma opção de frete disponível para esse CEP.</p>
            )}

            {shippingOptions && shippingOptions.length > 0 && (
              <ul className={styles.shippingList}>
                {shippingOptions.map((option) => (
                  <li key={option.serviceId} className={styles.shippingOption}>
                    <div>
                      <strong>{option.carrierName}</strong>
                      <span> — até {option.deliveryTimeDays} dia(s) úteis</span>
                    </div>
                    <div className={styles.shippingTotals}>
                      <span>{option.priceDisplay}</span>
                      <span className={styles.shippingGrandTotal}>
                        Total: {formatCentsToBRL(finalPrice * quantity + option.priceCents)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
