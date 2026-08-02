import { Link } from "react-router-dom";
import type { CategoryOutput } from "../types/api";
import styles from "./CategoryCard.module.css";

export function CategoryCard({ category }: { category: CategoryOutput }) {
  return (
    <Link to={`/produtos?categoria=${category.id}`} className={styles.card}>
      <span className={styles.icon} aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)" stroke="currentColor" strokeWidth="2" />
          <line x1="9.5" y1="14.5" x2="14.5" y2="9.5" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
      <span className={styles.name}>{category.name}</span>
    </Link>
  );
}
