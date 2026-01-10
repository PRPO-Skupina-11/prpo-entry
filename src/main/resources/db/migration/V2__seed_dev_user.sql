insert into entry.users (id, email, display_name, created_at)
values ('dev-user', 'dev@local', 'Dev', now())
on conflict (id) do nothing;
