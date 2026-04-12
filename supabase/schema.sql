create extension if not exists pgcrypto;

create table if not exists public.hackathon_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  whatsapp text not null,
  profile text not null,
  source text not null default 'elgato-solana-campaign',
  user_agent text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists hackathon_signups_email_idx
  on public.hackathon_signups (email);

create index if not exists hackathon_signups_submitted_at_idx
  on public.hackathon_signups (submitted_at desc);
