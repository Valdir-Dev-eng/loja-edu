CREATE TABLE IF NOT EXISTS imagens_produto (
    id UUID PRIMARY KEY,
    produto_id UUID NOT NULL REFERENCES produtos(id),
    url TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    alt_text VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS imagens_produto_produto_id_idx ON imagens_produto (produto_id);
