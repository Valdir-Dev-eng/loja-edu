const AZUL_CARGO_NAME_PATTERN = /azul\s*cargo/i;
const JADLOG_NAME_PATTERN = /jadlog/i;

export class MelhorEnvioCarrierRules {
    static isPurchasableViaApi(carrierName: string, isSandbox: boolean): boolean {
        if (AZUL_CARGO_NAME_PATTERN.test(carrierName)) {
            return false;
        }
        if (isSandbox && JADLOG_NAME_PATTERN.test(carrierName)) {
            return false;
        }
        return true;
    }
}
