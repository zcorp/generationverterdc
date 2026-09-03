-- GV-RDC public content model.
-- Apply only in the server deployment; never include this schema in the Pages artifact.

CREATE TABLE IF NOT EXISTS impact_stats (
    id BIGSERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    label_fr TEXT NOT NULL,
    label_en TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_items (
    id BIGSERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('video', 'resource', 'activity')),
    tag TEXT NOT NULL,
    title_fr TEXT NOT NULL,
    title_en TEXT,
    copy_fr TEXT NOT NULL,
    copy_en TEXT,
    url TEXT,
    thumbnail TEXT,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS impact_stats_public_order
    ON impact_stats (published, display_order);

CREATE INDEX IF NOT EXISTS media_items_public_order
    ON media_items (published, archived, display_order);
