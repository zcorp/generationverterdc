import { Pool } from "pg";

let pool;

export function getDbPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required in server mode");
    }

    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  return pool;
}

export async function ensurePublicContentSchema() {
  const client = getDbPool();

  await client.query(`
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

    ALTER TABLE impact_stats
      ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    CREATE INDEX IF NOT EXISTS impact_stats_public_order
      ON impact_stats (published, display_order);

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
      link_url TEXT,
      link_label TEXT,
      published BOOLEAN NOT NULL DEFAULT FALSE,
      archived BOOLEAN NOT NULL DEFAULT FALSE,
      display_order INTEGER NOT NULL DEFAULT 0,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE media_items
      ADD COLUMN IF NOT EXISTS tag TEXT,
      ADD COLUMN IF NOT EXISTS title_fr TEXT,
      ADD COLUMN IF NOT EXISTS title_en TEXT,
      ADD COLUMN IF NOT EXISTS copy_fr TEXT,
      ADD COLUMN IF NOT EXISTS copy_en TEXT,
      ADD COLUMN IF NOT EXISTS url TEXT,
      ADD COLUMN IF NOT EXISTS thumbnail TEXT,
      ADD COLUMN IF NOT EXISTS link_url TEXT,
      ADD COLUMN IF NOT EXISTS link_label TEXT,
      ADD COLUMN IF NOT EXISTS video_display_mode TEXT DEFAULT 'iframe',
      ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    CREATE INDEX IF NOT EXISTS media_items_public_order
      ON media_items (published, archived, display_order);

    CREATE TABLE IF NOT EXISTS news_items (
      id BIGSERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      title_fr TEXT NOT NULL,
      title_en TEXT,
      summary_fr TEXT NOT NULL,
      summary_en TEXT,
      image_url TEXT,
      embed_url TEXT,
      link_url TEXT,
      link_label TEXT,
      published BOOLEAN NOT NULL DEFAULT FALSE,
      archived BOOLEAN NOT NULL DEFAULT FALSE,
      display_order INTEGER NOT NULL DEFAULT 0,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE news_items
      ADD COLUMN IF NOT EXISTS category TEXT,
      ADD COLUMN IF NOT EXISTS title_fr TEXT,
      ADD COLUMN IF NOT EXISTS title_en TEXT,
      ADD COLUMN IF NOT EXISTS summary_fr TEXT,
      ADD COLUMN IF NOT EXISTS summary_en TEXT,
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS embed_url TEXT,
      ADD COLUMN IF NOT EXISTS link_url TEXT,
      ADD COLUMN IF NOT EXISTS link_label TEXT,
      ADD COLUMN IF NOT EXISTS video_display_mode TEXT DEFAULT 'iframe',
      ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    CREATE INDEX IF NOT EXISTS news_items_public_order
      ON news_items (published, archived, display_order);

    CREATE TABLE IF NOT EXISTS uploaded_images (
      id BIGSERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      id BIGSERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      content JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE site_settings
      ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    CREATE INDEX IF NOT EXISTS site_settings_key_idx
      ON site_settings (key);

    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'contact',
      source_type TEXT NOT NULL DEFAULT 'contact',
      source_page TEXT,
      consent_email BOOLEAN NOT NULL DEFAULT FALSE,
      consent_sms BOOLEAN NOT NULL DEFAULT FALSE,
      consent_communication BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'unsubscribed', 'banned')),
      email_verified_at TIMESTAMPTZ,
      last_contacted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS users_email_idx
      ON users (email);

    CREATE INDEX IF NOT EXISTS users_status_idx
      ON users (status, consent_communication);

    CREATE TABLE IF NOT EXISTS campaigns (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      filters JSONB NOT NULL DEFAULT '{}'::jsonb,
      channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'whatsapp', 'both')),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
      created_by TEXT,
      sent_at TIMESTAMPTZ,
      recipients_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE campaigns
      ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email';

    ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_channel_check;
    ALTER TABLE campaigns ADD CONSTRAINT campaigns_channel_check CHECK (channel IN ('email', 'sms', 'whatsapp', 'both'));

    CREATE TABLE IF NOT EXISTS campaign_deliveries (
      id BIGSERIAL PRIMARY KEY,
      campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      email TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'whatsapp', 'both')),
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
      response_message TEXT,
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE campaign_deliveries
      ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email';

    ALTER TABLE campaign_deliveries DROP CONSTRAINT IF EXISTS campaign_deliveries_channel_check;
    ALTER TABLE campaign_deliveries ADD CONSTRAINT campaign_deliveries_channel_check CHECK (channel IN ('email', 'sms', 'whatsapp', 'both'));

    CREATE INDEX IF NOT EXISTS campaigns_created_at_idx
      ON campaigns (created_at DESC);

    CREATE INDEX IF NOT EXISTS campaign_deliveries_campaign_idx
      ON campaign_deliveries (campaign_id, status);

    CREATE TABLE IF NOT EXISTS form_submissions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      submission_type TEXT NOT NULL CHECK (submission_type IN ('volunteer', 'partnership', 'contact', 'newsletter')),
      source_page TEXT NOT NULL,
      name TEXT,
      email TEXT,
      phone TEXT,
      subject TEXT,
      channel TEXT,
      message TEXT,
      consent BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'responded', 'closed')),
      admin_reply TEXT,
      replied_at TIMESTAMPTZ,
      reviewed_by TEXT,
      ip_address TEXT,
      user_agent TEXT,
      is_human_verified BOOLEAN NOT NULL DEFAULT FALSE,
      spam_score INTEGER NOT NULL DEFAULT 0,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE form_submissions
      ADD COLUMN IF NOT EXISTS user_id BIGINT,
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new',
      ADD COLUMN IF NOT EXISTS admin_reply TEXT,
      ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
      ADD COLUMN IF NOT EXISTS ip_address TEXT,
      ADD COLUMN IF NOT EXISTS user_agent TEXT,
      ADD COLUMN IF NOT EXISTS is_human_verified BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS spam_score INTEGER NOT NULL DEFAULT 0;

    CREATE INDEX IF NOT EXISTS form_submissions_created_at_idx
      ON form_submissions (created_at DESC);

    CREATE INDEX IF NOT EXISTS form_submissions_type_idx
      ON form_submissions (submission_type, created_at DESC);

    CREATE INDEX IF NOT EXISTS form_submissions_status_idx
      ON form_submissions (status, created_at DESC);

    CREATE INDEX IF NOT EXISTS form_submissions_user_idx
      ON form_submissions (user_id);
  `);
}
