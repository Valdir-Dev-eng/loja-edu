import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ProductCard } from "../components/ProductCard";
import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";
import styles from "./Products.module.css";

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();

  const search = searchParams.get("busca") ?? "";
  const categoryId = searchParams.get("categoria") ?? "";

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((product) => {
      const matchesSearch = search
        ? product.name.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchesCategory = categoryId ? product.categoryId === categoryId : true;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryId]);

  function handleCategoryClick(nextCategoryId: string) {
    const next = new URLSearchParams(searchParams);
    if (nextCategoryId) {
      next.set("categoria", nextCategoryId);
    } else {
      next.delete("categoria");
    }
    setSearchParams(next);
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{search ? `Resultados para "${search}"` : "Todos os produtos"}</h1>

      <div className={styles.filters}>
        <button
          className={`${styles.filterChip} ${!categoryId ? styles.filterChipActive : ""}`}
          onClick={() => handleCategoryClick("")}
        >
          Todas as categorias
        </button>
        {categories?.map((category) => (
          <button
            key={category.id}
            className={`${styles.filterChip} ${categoryId === category.id ? styles.filterChipActive : ""}`}
            onClick={() => handleCategoryClick(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {isLoading && <p className={styles.status}>Carregando produtos...</p>}

      {!isLoading && filteredProducts.length === 0 && (
        <p className={styles.status}>Nenhum produto encontrado com esses filtros.</p>
      )}

      <div className={styles.grid}>
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
