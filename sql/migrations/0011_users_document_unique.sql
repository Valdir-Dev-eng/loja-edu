-- document starts NULL for every user (only set once onboarding completes), so the
-- unique index only applies to rows that actually have a document, letting two
-- unboarded users both have a NULL document without colliding.
CREATE UNIQUE INDEX IF NOT EXISTS users_document_unique_idx
    ON users (document)
    WHERE document IS NOT NULL;
