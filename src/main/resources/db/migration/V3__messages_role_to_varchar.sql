alter table entry.messages
  alter column role type varchar(32)
  using role::text;
