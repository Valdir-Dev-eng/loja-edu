import { BusinessRuleError } from "../errors/BusinessRuleError";
import { ConflictError } from "../errors/ConflictError";
import { CreateId } from "../interface/CreateId";

export class Product {
  constructor(
    public id: string,
    public name: string,
    public priceCents: number,
    public discountCents: number | null,
    public stock: number,
    public weight: number,
    public width: number,
    public height: number,
    public length: number,
    public categoryId: string | null = null,
    public created_at: Date = new Date(),
    public updated_at: Date = new Date(),
    public deleted_at: Date | null = null
  ) {}

  static build(
    createId: CreateId,
    name: string,
    priceCents: number,
    discountCents: number | null,
    stock: number,
    weight: number,
    width: number,
    height: number,
    length: number,
    categoryId: string | null = null
  ): Product {
    Product.assertPositiveDimension(weight, "Peso");
    Product.assertPositiveDimension(width, "Largura");
    Product.assertPositiveDimension(height, "Altura");
    Product.assertPositiveDimension(length, "Comprimento");
    return new Product(
      createId(),
      name,
      priceCents,
      discountCents,
      stock,
      weight,
      width,
      height,
      length,
      categoryId,
      new Date(),
      new Date(),
      null
    );
  }

  private static assertPositiveDimension(value: number, label: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BusinessRuleError(`${label} do produto deve ser maior que zero.`);
    }
  }

  markAsUpdated(): void {
    this.updated_at = new Date();
  }

  softDelete(): void {
    if (this.deleted_at) {
      throw new ConflictError("Produto já está deletado.");
    }
    this.deleted_at = new Date();
  }

  updateFields(data: Partial<Product>): void {
    if (data.name !== undefined) this.name = data.name;
    if (data.priceCents !== undefined) this.priceCents = data.priceCents;
    if (data.discountCents !== undefined) this.discountCents = data.discountCents;
    if (data.stock !== undefined) this.stock = data.stock;
    if (data.weight !== undefined) {
      Product.assertPositiveDimension(data.weight, "Peso");
      this.weight = data.weight;
    }
    if (data.width !== undefined) {
      Product.assertPositiveDimension(data.width, "Largura");
      this.width = data.width;
    }
    if (data.height !== undefined) {
      Product.assertPositiveDimension(data.height, "Altura");
      this.height = data.height;
    }
    if (data.length !== undefined) {
      Product.assertPositiveDimension(data.length, "Comprimento");
      this.length = data.length;
    }
    if (data.categoryId !== undefined) this.categoryId = data.categoryId;
    this.updated_at = new Date();
  }
}
