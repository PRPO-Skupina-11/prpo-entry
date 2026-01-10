create index if not exists chats_user_updated_at_id_idx
  on entry.chats (user_id, updated_at desc, id desc);

drop index if exists entry.chats_user_updated_at_idx;
