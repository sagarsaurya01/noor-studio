-- Run this in your Supabase SQL editor

create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  input_type text not null check (input_type in ('topic', 'video')),
  topic text,
  video_url text,
  transcript text,
  brief jsonb,
  scripts jsonb,
  storyboard jsonb,
  selected_script integer default 0,
  status text default 'draft' check (status in ('draft', 'processing', 'completed')),
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.projects enable row level security;

-- Users can only see and edit their own projects
create policy "Users can manage their own projects"
  on public.projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
