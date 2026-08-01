import { AppError } from "./AppError";

export class OnboardingPendingError extends AppError {
    constructor(message: string = "Finalize seu cadastro para continuar.") {
        super(message);
    }
}
