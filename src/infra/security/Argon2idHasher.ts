import * as argon2 from "argon2";
import { PasswordHasher } from "../../domain/security/PasswordHasher";

export class Argon2idHasher extends PasswordHasher {
    async hash(password: string): Promise<string> {
        const hashResult = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16,
            timeCost: 3,
            parallelism: 1,
        } as any);
        return String(hashResult); 
    }

    async compare(password: string, hash: string): Promise<boolean> {
        return await argon2.verify(hash, password, {
            type: argon2.argon2id,
        } as any);
    }
}