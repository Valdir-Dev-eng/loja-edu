CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE produtos
    ADD COLUMN IF NOT EXISTS weight NUMERIC(10,3),
    ADD COLUMN IF NOT EXISTS width NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS height NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS length NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias(id);

UPDATE produtos SET weight = 1 WHERE weight IS NULL;
UPDATE produtos SET width = 1 WHERE width IS NULL;
UPDATE produtos SET height = 1 WHERE height IS NULL;
UPDATE produtos SET length = 1 WHERE length IS NULL;

ALTER TABLE produtos
    ALTER COLUMN weight SET NOT NULL,
    ALTER COLUMN width SET NOT NULL,
    ALTER COLUMN height SET NOT NULL,
    ALTER COLUMN length SET NOT NULL;

CREATE INDEX IF NOT EXISTS produtos_categoria_id_idx ON produtos (categoria_id);
