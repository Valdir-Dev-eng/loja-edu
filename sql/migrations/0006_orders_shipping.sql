ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS freight NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS shipping_service_id INTEGER,
    ADD COLUMN IF NOT EXISTS shipping_cart_item_id TEXT;

UPDATE pedidos SET freight = 0 WHERE freight IS NULL;

ALTER TABLE pedidos
    ALTER COLUMN freight SET NOT NULL;
