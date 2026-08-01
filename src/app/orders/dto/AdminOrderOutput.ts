import { OrderOutput } from "./OrderOutput";

export interface AdminOrderOutput extends OrderOutput {
    buyerEmail: string;
    buyerUsername: string;
}
