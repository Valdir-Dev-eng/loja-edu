-- Redesenho do carrinho: deixa de pertencer direto a um usuario e passa a
-- ser um recurso proprio (carrinho anonimo por padrao, associado a um
-- usuario so no login) — mesmo modelo usado pela Shopify e pela Medusa.js
-- (carrinho sempre no servidor, cliente guarda so um id opaco em cookie).
-- Sem dado real de cliente na tabela antiga ainda (produto em fase de
-- desenvolvimento) — dropar e recriar em vez de migrar dado.

DROP TABLE IF EXISTS itens_carrinho;

CREATE TABLE IF NOT EXISTS carrinhos (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- No maximo um carrinho ativo por usuario (carrinho anonimo nao tem
-- user_id, entao nao entra nessa restricao).
CREATE UNIQUE INDEX IF NOT EXISTS carrinhos_user_id_unique_idx
    ON carrinhos (user_id)
    WHERE deleted_at IS NULL AND user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS itens_carrinho (
    id UUID PRIMARY KEY,
    cart_id UUID NOT NULL REFERENCES carrinhos(id),
    produto_id UUID NOT NULL REFERENCES produtos(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS itens_carrinho_cart_produto_unique_idx
    ON itens_carrinho (cart_id, produto_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS itens_carrinho_cart_id_idx ON itens_carrinho (cart_id);
