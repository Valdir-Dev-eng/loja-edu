export class Product {
  constructor(
    public id: string,
    public name: string,
    public price: string,
    public discount: string | null,
    public stock: number,
    public created_at: Date = new Date(),
    public updated_at: Date = new Date(),
    public deleted_at: Date | null = null
  ) {}

  static build(
     createId:()=>string,
     name: string,
     price: string,
     discount: string | null,
     stock: number,
  ):Product{
    return new Product(createId(),name,price,discount,stock,new Date(),new Date, null)
  }

  markAsUpdated(): void {
    this.updated_at = new Date();
  }

  softDelete(): void {
    this.deleted_at = new Date();
  }

  public updateFields(data: Partial<Product>): void {
  if (data.name !== undefined) this.name = data.name;
  if (data.price !== undefined) this.price = data.price;
  if (data.stock !== undefined) this.stock = data.stock;
  this.updated_at = new Date();
}
}