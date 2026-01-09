create schema if not exists entry;

create table if not exists entry.users (
  id text primary key,
  email text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists entry.chats (
  id text primary key,
  user_id text not null,
  title text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_provider_id text null,
  last_model_id text null,
  constraint chats_user_id_fk foreign key (user_id) references entry.users(id)
);

create index if not exists chats_user_updated_at_idx
  on entry.chats (user_id, updated_at desc);

create type entry.message_role as enum ('user', 'assistant', 'system');

create table if not exists entry.messages (
  id text primary key,
  chat_id text not null,
  role entry.message_role not null,
  content text not null,
  created_at timestamptz not null default now(),
  provider_id text null,
  model_id text null,
  request_id text null,
  constraint messages_chat_id_fk foreign key (chat_id) references entry.chats(id)
);

create index if not exists messages_chat_created_at_idx
  on entry.messages (chat_id, created_at asc);
