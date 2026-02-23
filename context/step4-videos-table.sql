create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  source_video_url text not null,
  processed_video_url text not null,
  ad_slot jsonb not null,
  status text not null default 'ready' check (status in ('processing', 'ready', 'failed')),
  prompt_context text,
  created_at timestamptz not null default now()
);

create index if not exists videos_clerk_user_id_idx on public.videos (clerk_user_id);
create index if not exists videos_created_at_idx on public.videos (created_at desc);
