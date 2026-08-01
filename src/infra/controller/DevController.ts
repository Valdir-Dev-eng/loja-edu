import { PromoteUserToAdminOutput } from "../../app/users/dto/PromoteUserToAdminOutput";
import { PromoteUserToAdmin } from "../../app/users/useCase/PromoteUserToAdmin";

export class DevController {
    constructor(private promoteUserToAdmin: PromoteUserToAdmin) {}

    async promoteMe(userId: string): Promise<PromoteUserToAdminOutput> {
        return await this.promoteUserToAdmin.execute({ userId });
    }
}
