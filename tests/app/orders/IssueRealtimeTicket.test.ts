import { describe, expect, it } from "vitest";
import { IssueRealtimeTicket } from "../../../src/app/orders/useCase/IssueRealtimeTicket";
import { FakeWebSocketNotifierPort } from "../../doubles/FakeWebSocketNotifierPort";

describe("IssueRealtimeTicket", () => {
    it("emite o ticket do usuário autenticado pra abrir o WebSocket", async () => {
        const wsNotifier = new FakeWebSocketNotifierPort();
        wsNotifier.setNextTicket("ticket-abc");
        const useCase = new IssueRealtimeTicket(wsNotifier);

        const output = await useCase.execute("user-1");

        expect(output.ticket).toBe("ticket-abc");
        expect(wsNotifier.issuedTicketsForUserIds).toEqual(["user-1"]);
    });
});
