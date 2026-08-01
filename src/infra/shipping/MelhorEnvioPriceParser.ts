import { BusinessRuleError } from "../../domain/errors/BusinessRuleError";

export class MelhorEnvioPriceParser {
    static toCents(value: unknown): number {
        const numeric = typeof value === "string" ? Number(value) : value;
        if (typeof numeric !== "number" || !Number.isFinite(numeric)) {
            throw new BusinessRuleError("Valor de frete retornado pelo Melhor Envio é inválido.");
        }
        return Math.round(numeric * 100);
    }
}
