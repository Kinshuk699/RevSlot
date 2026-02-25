-- RevSlot Database Schema (Supabase / Postgres)
-- Run these in the Supabase SQL editor to set up the database.

-- ═══════════════════════════════════════════════════════════════
-- 1. Profiles table — stores Clerk user data and plan info
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'creator', 'studio')),
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_clerk_user_id_idx
  ON public.profiles (clerk_user_id);

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id);

-- ═══════════════════════════════════════════════════════════════
-- 2. Videos table — stores pipeline results
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  source_video_url text NOT NULL,
  processed_video_url text NOT NULL,
  ad_slot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'failed')),
  prompt_context text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS videos_clerk_user_id_idx
  ON public.videos (clerk_user_id);

CREATE INDEX IF NOT EXISTS videos_created_at_idx
  ON public.videos (created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 3. Storage bucket — user-videos
-- ═══════════════════════════════════════════════════════════════
-- Create a public bucket named "user-videos" in the Supabase
-- Storage dashboard. This stores uploaded MP4 files and persisted
-- AI-generated assets (inpainted frames + video clips).
--
-- Bucket settings:
--   Name: user-videos
--   Public: Yes (so video URLs are accessible without auth)
--   File size limit: 200MB (recommended)
--   Allowed MIME types: video/mp4, image/jpeg, image/png, application/octet-stream
