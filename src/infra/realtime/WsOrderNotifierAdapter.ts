import type { IncomingMessage, Server } from "node:http";
import type { Socket } from "node:net";
import { v4 as uuidv4 } from "uuid";
import { WebSocket, WebSocketServer } from "ws";
import { CachePort } from "../../domain/database/CachePort";
import { OrderStatus } from "../../domain/entites/Order";
import { WebSocketNotifierPort } from "../../domain/realtime/WebSocketNotifierPort";

const TICKET_TTL_SECONDS = 30;
const WS_PATH = "/ws/orders";

// Ticket avulso (curto, uso unico) em vez do cookie de sessao: o handshake de
// upgrade e' uma requisicao HTTP normal, mas o navegador so envia o cookie
// tokenUser pra origem que o SETOU — como o front chama a API sempre via
// proxy do Next (fica "primeira parte" daquela origem), o cookie nunca
// existe pra origem direta do Express que este WS abre. O ticket e emitido
// por uma rota autenticada normal (que passa pelo proxy, entao ve o cookie)
// e trocado aqui por uma conexao real.
export class WsOrderNotifierAdapter extends WebSocketNotifierPort {
    private readonly wss: WebSocketServer;
    private readonly socketsByUserId = new Map<string, Set<WebSocket>>();

    constructor(httpServer: Server, private readonly cache: CachePort) {
        super();
        this.wss = new WebSocketServer({ noServer: true });
        httpServer.on("upgrade", this.handleUpgrade);
    }

    async issueConnectionTicket(userId: string): Promise<string> {
        const ticket = uuidv4();
        await this.cache.set(this.ticketKey(ticket), userId, TICKET_TTL_SECONDS);
        return ticket;
    }

    notifyOrderPaymentUpdated(userId: string, orderId: string, status: OrderStatus): void {
        const sockets = this.socketsByUserId.get(userId);
        if (!sockets) {
            return;
        }
        const payload = JSON.stringify({ orderId, status });
        for (const socket of sockets) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(payload);
            }
        }
    }

    private handleUpgrade = async (request: IncomingMessage, socket: Socket, head: Buffer): Promise<void> => {
        const url = new URL(request.url ?? "", "http://localhost");
        const ticket = url.pathname === WS_PATH ? url.searchParams.get("ticket") : null;
        const userId = ticket ? await this.cache.get(this.ticketKey(ticket)) : null;
        if (!ticket || !userId) {
            socket.destroy();
            return;
        }
        await this.cache.del(this.ticketKey(ticket));
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.registerConnection(userId, ws);
        });
    };

    private registerConnection(userId: string, ws: WebSocket): void {
        const sockets = this.socketsByUserId.get(userId) ?? new Set<WebSocket>();
        sockets.add(ws);
        this.socketsByUserId.set(userId, sockets);
        ws.on("close", () => {
            const remaining = this.socketsByUserId.get(userId);
            remaining?.delete(ws);
            if (remaining && remaining.size === 0) {
                this.socketsByUserId.delete(userId);
            }
        });
    }

    private ticketKey(ticket: string): string {
        return `ws-ticket:${ticket}`;
    }
}
