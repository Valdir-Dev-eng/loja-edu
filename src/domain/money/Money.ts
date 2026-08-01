import { BusinessRuleError } from "../errors/BusinessRuleError";

const DECIMAL_STRING_PATTERN = /^-?\d+(\.\d{1,2})?$/;

export class Money {
    static fromDecimalString(value: string): number {
        const trimmed = value.trim();
        if (!DECIMAL_STRING_PATTERN.test(trimmed)) {
            throw new BusinessRuleError("Valor monetário inválido.");
        }
        const [integerPart, decimalPart = ""] = trimmed.split(".");
        const sign = integerPart.startsWith("-") ? -1 : 1;
        const cents = Math.abs(Number(integerPart)) * 100 + Number(decimalPart.padEnd(2, "0"));
        return sign * Math.round(cents);
    }

    static fromDecimalNumber(value: number): number {
        if (!Number.isFinite(value)) {
            throw new BusinessRuleError("Valor monetário inválido.");
        }
        return Math.round(value * 100);
    }

    static toDecimalString(cents: number): string {
        if (!Number.isInteger(cents)) {
            throw new BusinessRuleError("Valor monetário inválido.");
        }
        const sign = cents < 0 ? "-" : "";
        const absCents = Math.abs(cents);
        const integerPart = Math.floor(absCents / 100);
        const decimalPart = String(absCents % 100).padStart(2, "0");
        return `${sign}${integerPart}.${decimalPart}`;
    }

    static toDisplay(cents: number): string {
        return `R$ ${Money.toDecimalString(cents).replace(".", ",")}`;
    }
}
