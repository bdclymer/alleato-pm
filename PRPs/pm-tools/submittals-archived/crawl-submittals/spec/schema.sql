-- SUBMITTALS DOMAIN SCHEMA
-- Generated from Procore command analysis

create table app_schedule_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  name text not null,
  start_date date,
  finish_date date,
  duration_days int,
  percent_complete int,
  status text,
  created_at timestamptz default now()
);

create table app_schedule_dependencies (
  id uuid primary key default gen_random_uuid(),
  predecessor_task_id uuid references app_schedule_tasks(id),
  successor_task_id uuid references app_schedule_tasks(id),
  dependency_type text not null,
  lag_days int default 0
);

create table app_schedule_deadlines (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references app_schedule_tasks(id),
  deadline_date date not null,
  created_at timestamptz default now()
);
