alter table entry.users
  alter column email drop not null;

alter table entry.users
  alter column display_name drop not null;
