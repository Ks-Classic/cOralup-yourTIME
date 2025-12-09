-- Enable RLS for all public tables and ensure service_role can operate
do $$
declare
  r record;
  policy_name text;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not like 'pg_%'
      and tablename not like 'sql_%'
  loop
    -- RLSを有効化
    execute format('alter table %I.%I enable row level security;', r.schemaname, r.tablename);

    -- service_role用ポリシー（存在チェックしてから作成）
    policy_name := r.tablename || '_service_role_all';
    if not exists (
      select 1 from pg_policies
      where schemaname = r.schemaname
        and tablename = r.tablename
        and policyname = policy_name
    ) then
      execute format(
        'create policy %I on %I.%I for all to service_role using (true) with check (true);',
        policy_name,
        r.schemaname,
        r.tablename
      );
    end if;
  end loop;
end $$;

