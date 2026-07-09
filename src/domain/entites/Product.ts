export class Product {
  constructor(
    public id: string,
    public name: string,
    public price: string,
    public discount: string | null,
    public stock: number,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public deletedAt: Date | null = null
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
    this.updatedAt = new Date();
  }

  softDelete(): void {
    this.deletedAt = new Date();
  }
}