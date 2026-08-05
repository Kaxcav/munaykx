-- MUNAY · tabela de leads do site (rodar no SQL Editor do Supabase)

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tipo text not null check (tipo in ('participante', 'organizador')),
  nome text not null,
  email text not null,
  whatsapp text,
  -- participante
  modalidades text,
  regiao text,
  -- organizador
  organizacao text,
  modalidade text,
  origem text not null default 'site'
);

-- Evita duplicados: mesma pessoa pode entrar 1x como participante e 1x como organizador
create unique index if not exists leads_email_tipo_uidx
  on public.leads (lower(email), tipo);

-- RLS ligado; nenhuma policy pública de insert/select.
-- O site grava via service_role (server-side), que ignora RLS por design.
alter table public.leads enable row level security;
