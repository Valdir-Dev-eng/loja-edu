import { ProductInput } from "./app/products/dto/ProductInput"
import { CreateProduct } from "./app/products/useCase/CreateProduct"
import {ConfigEnv} from "./infra/config/ConfigEnv"
import { PostgresDataAccess } from "./infra/database/PostgresDataAccess"
import { ProductRepository } from "./infra/repository/ProductRepository"
import { v4 as uuidv4 } from 'uuid'

// ... imports anteriores
import { UpdateProduct } from "./app/products/useCase/UpdateProduct";
import { DeleteProduct } from "./app/products/useCase/DeleteProduct"

async function start() {
    const config = new ConfigEnv();
    const data = new PostgresDataAccess(config.getVariable("DIRECT_URL"));
    const repo = new ProductRepository(data);
const deleteProduct = new DeleteProduct(repo);

// Deleta logicamente o produto
await deleteProduct.execute('c6ac46e8-b81c-4894-8d9d-94cbc6359756');

console.log("Produto removido com sucesso!");
}

start()