-- Run after the migrate-email-domain Edge Function creates or updates
-- skola@skolehr.xyz in Supabase Auth.

do $$
declare
  v_email constant text := 'skola@skolehr.xyz';
  v_auth_user_id uuid;
  v_profile_id uuid;
begin
  select id
  into v_auth_user_id
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_auth_user_id is null then
    raise exception
      'Supabase Auth korisnik % ne postoji. Prvo pokrenite migrate-email-domain Edge Function.',
      v_email;
  end if;

  select id
  into v_profile_id
  from public.user_profiles
  where auth_user_id = v_auth_user_id
     or lower(email) = v_email
  order by case when auth_user_id = v_auth_user_id then 0 else 1 end
  limit 1;

  if v_profile_id is null then
    insert into public.user_profiles (
      auth_user_id,
      email,
      name,
      access_role,
      active_school_id,
      is_first_login,
      requires_password_change
    )
    values (
      v_auth_user_id,
      v_email,
      'Glavni administrator SkoleHR',
      'super_admin',
      null,
      false,
      false
    )
    returning id into v_profile_id;
  else
    update public.user_profiles
    set auth_user_id = v_auth_user_id,
        email = v_email,
        name = coalesce(nullif(btrim(name), ''), 'Glavni administrator SkoleHR'),
        access_role = 'super_admin',
        active_school_id = null,
        is_first_login = false,
        requires_password_change = false
    where id = v_profile_id;
  end if;

  delete from public.user_school_roles
  where user_id = v_profile_id;
end;
$$;
