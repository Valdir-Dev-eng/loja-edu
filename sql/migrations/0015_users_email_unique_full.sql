-- Antes: unico so entre linhas ativas (WHERE deleted_at IS NULL), decisao que permitia
-- reaproveitar e-mail via linha NOVA apos soft delete. Isso duplicava identidade (mesma
-- pessoa, N linhas de users, pedidos/enderecos espalhados entre elas) toda vez que a
-- mesma conta Google era reativada. Decisao revertida: agora e-mail e unico em qualquer
-- estado (ativo ou soft-deletado) e o codigo (AuthenticateWithGoogle) reativa a linha
-- existente em vez de criar outra. Requer que nao existam e-mails duplicados entre
-- linhas ativas+deletadas no momento de aplicar esta migracao.
DROP INDEX IF EXISTS users_email_unique_active;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);
