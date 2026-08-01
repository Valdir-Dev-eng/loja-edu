import { createClient, RedisClientType } from 'redis';
import { CachePort } from '../../domain/database/CachePort';
import { ConfigCache } from '../config/ConfigCache';

export class RedisCacheAdapter extends CachePort {
    private client: RedisClientType;

    constructor() {
        super();
        const secrets = ConfigCache.getSecrets()
        this.client = createClient({
            username: 'default',
            password: secrets.key, 
            socket: {
                host: secrets.host,
                port: secrets.port,
                keepAlive: true,
                reconnectStrategy: (retries) => {
            if (retries > 20) {
                return new Error('Limite de tentativas de reconexão atingido');
            }
            return Math.min(retries * 50, 2000);
        }
            }
        });

        this.client.on('error', (err) => console.error('Redis Client Error', err));
        this.client.connect().catch(console.error);
    }

    async connect(): Promise<void> {
        await this.client.connect();
    }


    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        await this.client.set(key, value, {
            EX: ttlSeconds
        });
    }

    async get(key: string): Promise<string | null> {
        return await this.client.get(key);
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }
}