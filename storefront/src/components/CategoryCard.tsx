import { Link } from "react-router-dom";
import type { CategoryOutput } from "../types/api";
import styles from "./CategoryCard.module.css";

export function CategoryCard({ category }: { category: CategoryOutput }) {
  return (
    <Link to={`/produtos?categoria=${category.id}`} className={styles.card}>
      <span className={styles.icon} aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="9" width="20" height="6" rx="3" transform="rotate(-45 12 12)" fill="currentColor" />
          <path d="M8.5 8.5L15.5 15.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className={styles.name}>{category.name}</span>
    </Link>
  );
}
