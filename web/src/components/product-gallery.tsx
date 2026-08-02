"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductImageOutput } from "@/lib/api-types";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  productName: string;
  images: ProductImageOutput[];
}

export function ProductGallery({ productName, images }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const ordered = [...images].sort((a, b) => a.order - b.order);
  const active = ordered[activeIndex];

  return (
    <div className="sticky top-20 flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary">
        {active ? (
          <Image
            src={active.url}
            alt={active.altText ?? productName}
            fill
            sizes="(max-width: 768px) 100vw, 440px"
            priority
            className="object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center bg-brand-red-light text-6xl font-extrabold text-brand-red">
            {productName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {ordered.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {ordered.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Ver imagem ${index + 1} de ${productName}`}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-lg border-2",
                index === activeIndex ? "border-brand-red" : "border-border"
              )}
            >
              <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
