ALTER TABLE enderecos
    ADD COLUMN IF NOT EXISTS label VARCHAR(50);

UPDATE enderecos SET label = 'Casa' WHERE label IS NULL;

ALTER TABLE enderecos
    ALTER COLUMN label SET NOT NULL;
