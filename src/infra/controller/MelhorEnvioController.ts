import { CompleteMelhorEnvioConnection } from "../../app/shipping/useCase/CompleteMelhorEnvioConnection";

export class MelhorEnvioController {
    constructor(private completeMelhorEnvioConnection: CompleteMelhorEnvioConnection) {}

    async completeConnection(code: string, redirectUri: string): Promise<void> {
        await this.completeMelhorEnvioConnection.execute({ code, redirectUri });
    }
}
