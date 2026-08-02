import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageFallbackProps {
  size?: "sm" | "lg" | "xl";
  className?: string;
}

const ICON_SIZE: Record<NonNullable<ProductImageFallbackProps["size"]>, string> = {
  sm: "size-5",
  lg: "size-9 sm:size-10",
  xl: "size-12 sm:size-14",
};

// Placeholder pra produto sem foto cadastrada — precisa deixar claro que e
// "sem foto ainda" e nao um erro de carregamento de imagem quebrada.
export function ProductImageFallback({ size = "lg", className }: ProductImageFallbackProps) {
  return (
    <div className={cn("flex size-full items-center justify-center bg-brand-red-light", className)}>
      <ImageOff className={cn(ICON_SIZE[size], "text-brand-red/50")} aria-hidden="true" />
    </div>
  );
}
