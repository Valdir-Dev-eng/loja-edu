ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username VARCHAR(150),
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users
SET username = split_part(email, '@', 1) || '_' || substr(id::text, 1, 8)
WHERE username IS NULL;

ALTER TABLE users
    ALTER COLUMN username SET NOT NULL,
    ADD CONSTRAINT users_username_unique UNIQUE (username);

ALTER TABLE users
    ADD CONSTRAINT users_email_unique UNIQUE (email);

ALTER TABLE users
    DROP COLUMN IF EXISTS password,
    DROP COLUMN IF EXISTS is_verified,
    DROP COLUMN IF EXISTS name;

CREATE TABLE IF NOT EXISTS enderecos (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    recipient_name VARCHAR(150) NOT NULL,
    zip_code CHAR(8) NOT NULL,
    street VARCHAR(150) NOT NULL,
    number VARCHAR(20) NOT NULL,
    complement VARCHAR(150),
    neighborhood VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state CHAR(2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS enderecos_user_id_idx ON enderecos (user_id);
