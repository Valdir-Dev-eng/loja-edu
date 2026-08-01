-- Dinheiro fica em NUMERIC(10,2) no banco (decimal exato do Postgres, sem risco de
-- arredondamento) e é convertido para inteiro em centavos só na fronteira do Repository.
-- O domínio (Order/OrderItem) nunca manipula float; o banco continua legível via SQL direto.

ALTER TABLE pedidos
    ALTER COLUMN total TYPE NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS payment_id TEXT,
    ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES enderecos(id);

UPDATE pedidos SET status = 'PENDING_PAYMENT' WHERE status = 'PENDING';
UPDATE pedidos SET status = 'PAID' WHERE status = 'SHIPPED';
UPDATE pedidos SET status = 'CANCELLED'
WHERE status NOT IN ('PENDING_PAYMENT', 'PAID', 'REJECTED', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'CHARGEBACK');

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_status_check') THEN
        ALTER TABLE pedidos
            ADD CONSTRAINT pedidos_status_check CHECK (
                status IN ('PENDING_PAYMENT', 'PAID', 'REJECTED', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'CHARGEBACK')
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS pedidos_user_id_idx ON pedidos (user_id);
CREATE INDEX IF NOT EXISTS pedidos_payment_id_idx ON pedidos (payment_id);

ALTER TABLE itens_pedido
    ALTER COLUMN price_at_purchase TYPE NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS product_name VARCHAR(150) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE itens_pedido ALTER COLUMN product_name DROP DEFAULT;

CREATE INDEX IF NOT EXISTS itens_pedido_pedido_id_idx ON itens_pedido (pedido_id);
