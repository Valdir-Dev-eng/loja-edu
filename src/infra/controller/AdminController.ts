import { AdminUserOutput } from "../../app/users/dto/AdminUserOutput";
import { ListUsersForAdmin } from "../../app/users/useCase/ListUsersForAdmin";

export class AdminController {
    constructor(private listUsersForAdmin: ListUsersForAdmin) {}

    async listUsers(): Promise<AdminUserOutput[]> {
        return await this.listUsersForAdmin.execute();
    }
}
