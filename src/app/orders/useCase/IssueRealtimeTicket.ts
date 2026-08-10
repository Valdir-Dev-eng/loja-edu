import { WebSocketNotifierPort } from "../../../domain/realtime/WebSocketNotifierPort";
import { RealtimeTicketOutput } from "../dto/RealtimeTicketOutput";

export class IssueRealtimeTicket {
    constructor(private wsNotifier: WebSocketNotifierPort) {}

    async execute(userId: string): Promise<RealtimeTicketOutput> {
        const ticket = await this.wsNotifier.issueConnectionTicket(userId);
        return { ticket };
    }
}
