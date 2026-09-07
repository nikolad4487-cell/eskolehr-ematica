-- Hide programme options that belong to deleted or inactive institutions.

update public.programs p
set is_active = false,
    updated_at = now()
where coalesce(p.is_active, true) = true
  and not exists (
    select 1
    from public.schools s
    where s.id = p.school_id
      and coalesce(s.is_active, true) = true
  );
