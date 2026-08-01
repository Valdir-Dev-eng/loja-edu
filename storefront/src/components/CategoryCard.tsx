import { Link } from "react-router-dom";
import type { CategoryOutput } from "../types/api";
import styles from "./CategoryCard.module.css";

export function CategoryCard({ category }: { category: CategoryOutput }) {
  return (
    <Link to={`/produtos?categoria=${category.id}`} className={styles.card}>
      <span className={styles.icon} aria-hidden="true">
        {category.name.charAt(0).toUpperCase()}
      </span>
      <span className={styles.name}>{category.name}</span>
    </Link>
  );
}
