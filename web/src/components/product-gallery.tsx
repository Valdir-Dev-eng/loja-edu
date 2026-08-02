"use client";

import { useState } from "react";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import type { ProductImageOutput } from "@/lib/api-types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  productName: string;
  images: ProductImageOutput[];
}

export function ProductGallery({ productName, images }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const ordered = [...images].sort((a, b) => a.order - b.order);
  const active = ordered[activeIndex];

  return (
    <div className="sticky top-20 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => active && setZoomOpen(true)}
        disabled={!active}
        aria-label={`Ampliar imagem de ${productName}`}
        className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary"
      >
        {active ? (
          <>
            <Image
              src={active.url}
              alt={active.altText ?? productName}
              fill
              sizes="(max-width: 768px) 100vw, 440px"
              priority
              className="object-cover"
            />
            <span className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              <ZoomIn className="size-4" />
            </span>
          </>
        ) : (
          <span className="flex size-full items-center justify-center bg-brand-red-light text-6xl font-extrabold text-brand-red">
            {productName.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-2xl! sm:max-w-2xl!">
          <DialogTitle className="sr-only">{productName}</DialogTitle>
          {active && (
            <div className="relative aspect-square w-full overflow-hidden rounded-lg">
              <Image src={active.url} alt={active.altText ?? productName} fill sizes="90vw" className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>

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
