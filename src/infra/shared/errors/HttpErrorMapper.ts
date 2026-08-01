import { BusinessRuleError } from "../../../domain/errors/BusinessRuleError";
import { ConflictError } from "../../../domain/errors/ConflictError";
import { ForbiddenError } from "../../../domain/errors/ForbiddenError";
import { IntegrationNotConnectedError } from "../../../domain/errors/IntegrationNotConnectedError";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { OnboardingPendingError } from "../../../domain/errors/OnboardingPendingError";
import { UnauthorizedError } from "../../../domain/errors/UnauthorizedError";
import { ValidationError } from "./ValidationError";

export interface HttpErrorBody {
    error: string;
    details?: unknown;
}

export interface HttpErrorResponse {
    status: number;
    body: HttpErrorBody;
}

export class HttpErrorMapper {
    static toHttp(error: unknown): HttpErrorResponse {
        if (error instanceof ValidationError) {
            return { status: 400, body: { error: error.message, details: this.formatValidationDetails(error) } };
        }
        if (error instanceof OnboardingPendingError) {
            return { status: 403, body: { error: error.message, details: { onboardingPending: true } } };
        }
        if (error instanceof UnauthorizedError) {
            return { status: 401, body: { error: error.message } };
        }
        if (error instanceof ForbiddenError) {
            return { status: 403, body: { error: error.message } };
        }
        if (error instanceof NotFoundError) {
            return { status: 404, body: { error: error.message } };
        }
        if (error instanceof ConflictError) {
            return { status: 409, body: { error: error.message } };
        }
        if (error instanceof BusinessRuleError) {
            return { status: 422, body: { error: error.message } };
        }
        if (error instanceof IntegrationNotConnectedError) {
            return { status: 503, body: { error: error.message } };
        }
        console.error("Erro não mapeado na taxonomia de negócio, respondendo 500:", error);
        return { status: 500, body: { error: "Erro interno do servidor" } };
    }

    private static formatValidationDetails(error: ValidationError): Record<string, string[]> {
        const details = error.details;
        const formatted: Record<string, string[]> = {};
        if (!details || typeof details !== "object") {
            return formatted;
        }
        Object.keys(details).forEach((key) => {
            if (key === "_errors") return;
            const fieldError = (details as unknown as Record<string, { _errors?: string[] }>)[key];
            if (fieldError && Array.isArray(fieldError._errors)) {
                formatted[key] = fieldError._errors;
            }
        });
        return formatted;
    }
}
