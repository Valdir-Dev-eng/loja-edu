CREATE TABLE IF NOT EXISTS itens_carrinho (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    produto_id UUID NOT NULL REFERENCES produtos(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Um item ativo por usuario+produto — "adicionar ao carrinho" incrementa a
-- linha existente em vez de duplicar.
CREATE UNIQUE INDEX IF NOT EXISTS itens_carrinho_user_produto_unique_idx
    ON itens_carrinho (user_id, produto_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS itens_carrinho_user_id_idx ON itens_carrinho (user_id);
