import { FormEvent, useState } from "react";
import { useParams } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { useProduct } from "../hooks/useProducts";
import { useProductImages } from "../hooks/useProductImages";
import { api } from "../lib/api";
import { discountPercentage, finalPriceCents, formatCentsToBRL } from "../lib/money";
import type { ShippingOption } from "../types/api";
import styles from "./ProductDetail.module.css";

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: productData, isLoading } = useProduct(id);
  const { data: images } = useProductImages(id ?? "");
  const { addItem } = useCart();

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
    return <p className={`container ${styles.status}`}>Produto não encontrado.</p>;
  }

  const product = productData;
  const percentage = discountPercentage(product.priceCents, product.discountCents);
  const finalPrice = finalPriceCents(product.priceCents, product.discountCents);
  const orderedImages = images ? [...images].sort((a, b) => a.order - b.order) : [];
  const activeImage = orderedImages[selectedImageIndex];

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
    } catch (error) {
      setShippingOptions(null);
      setShippingError(error instanceof Error ? error.message : "Não foi possível calcular o frete.");
    } finally {
      setShippingLoading(false);
    }
  }

  function handleAddToCart() {
    addItem(
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
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
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

          <div className={styles.priceRow}>
            {percentage > 0 && <span className={styles.oldPrice}>{formatCentsToBRL(product.priceCents)}</span>}
            <span className={styles.price}>{formatCentsToBRL(finalPrice)}</span>
            {percentage > 0 && <span className={styles.discountBadge}>-{percentage}%</span>}
          </div>

          <p className={styles.stock}>
            {product.stock > 0 ? `${product.stock} em estoque` : "Produto sem estoque no momento"}
          </p>

          <div className={styles.quantityRow}>
            <label htmlFor="quantity">Quantidade</label>
            <div className={styles.quantityStepper}>
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Diminuir quantidade">
                −
              </button>
              <input
                id="quantity"
                type="number"
                min={1}
                max={product.stock}
                value={quantity}
                onChange={(event) => setQuantity(Math.min(Math.max(1, Number(event.target.value)), product.stock))}
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                aria-label="Aumentar quantidade"
              >
                +
              </button>
            </div>
          </div>

          <button className={styles.addButton} onClick={handleAddToCart} disabled={product.stock <= 0}>
            {added ? "Adicionado ✓" : "Adicionar ao carrinho"}
          </button>

          <div className={styles.shippingBox}>
            <h2 className={styles.shippingTitle}>Calcular frete e prazo</h2>
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
