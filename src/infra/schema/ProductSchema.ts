import { z } from "zod";

export const ProductSchema = z.object({
  name: z.string().min(3).max(100),
  priceCents: z.number().int().positive(),
  discountCents: z.number().int().nonnegative().nullable(),
  stock: z.number().int().min(0),
  weight: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  length: z.number().positive(),
  categoryId: z.string().uuid().nullable(),
});

export type ProductInput = z.infer<typeof ProductSchema>;