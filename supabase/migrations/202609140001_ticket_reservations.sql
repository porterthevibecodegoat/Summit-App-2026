create table if not exists public.ticket_reservations (
  id uuid primary key default gen_random_uuid(),
  attendee_name text not null check (char_length(attendee_name) between 2 and 120),
  attendee_email text not null,
  donation_cents bigint not null default 0 check (donation_cents between 0 and 100000000),
  status text not null default 'reserved' check (status in ('reserved','cancelled')),
  created_at timestamptz not null default now()
);
create unique index if not exists ticket_reservations_email_unique on public.ticket_reservations (lower(attendee_email)) where status = 'reserved';
alter table public.ticket_reservations enable row level security;

create or replace function public.reserve_summit_ticket(p_name text, p_email text, p_donation_cents bigint default 0)
returns public.ticket_reservations
language plpgsql security definer set search_path = public
as $$
declare created public.ticket_reservations;
begin
  perform pg_advisory_xact_lock(2026, 1000);
  if (select count(*) from public.ticket_reservations where status = 'reserved') >= 1000 then
    raise exception 'SOLD_OUT';
  end if;
  insert into public.ticket_reservations(attendee_name, attendee_email, donation_cents)
  values (trim(p_name), lower(trim(p_email)), p_donation_cents) returning * into created;
  return created;
end;
$$;
revoke all on function public.reserve_summit_ticket(text,text,bigint) from public, anon, authenticated;
