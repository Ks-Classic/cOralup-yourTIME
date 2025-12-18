-- Create ai_prompts table for managing system prompts
create table if not exists public.ai_prompts (
  id uuid default gen_random_uuid() primary key,
  label text not null, -- e.g. "v1.0 初期リリース", "v1.1 優しさ調整"
  prompt_template text not null, -- The actual system prompt with template variables
  is_active boolean default false, -- Only one record should be true at a time
  description text, -- Internal notes about this version
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add index for faster active prompt lookup
create index if not exists ai_prompts_is_active_idx on public.ai_prompts (is_active);

-- Function to ensure only one active prompt exists
create or replace function public.ensure_single_active_prompt()
returns trigger as $$
begin
  if new.is_active = true then
    update public.ai_prompts
    set is_active = false
    where id <> new.id
    and is_active = true;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to enforce single active prompt
create trigger enforce_single_active_prompt_trigger
before insert or update of is_active on public.ai_prompts
for each row
when (new.is_active = true)
execute function public.ensure_single_active_prompt();

-- Enable RLS
alter table public.ai_prompts enable row level security;

-- Policies
-- Admins can do everything
create policy "Admins can view detailed prompts"
  on public.ai_prompts for select
  using ( true ); -- Temporarily allow all for dev, tighten later to admin role

create policy "Admins can insert prompts"
  on public.ai_prompts for insert
  with check ( true );

create policy "Admins can update prompts"
  on public.ai_prompts for update
  using ( true );
