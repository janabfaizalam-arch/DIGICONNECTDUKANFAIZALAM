-- Customer PIN auth: allow Create/Forgot PIN before a PIN exists.
-- Also one-time defensive repair for verified profile-only identity 9455062648.
-- Safe / reversible: does not delete applications, wallets, or auth users.

alter table public.customers
  alter column hashed_pin drop not null;

comment on column public.customers.hashed_pin is
  'Argon2id PIN hash. NULL means PIN not yet created (Forgot/Create PIN required).';

-- Deterministic repair for profile 8ddbc21c-8b48-4112-a517-073e359e0a33 / mobile 9455062648
-- Preconditions checked inline; no-op when already healthy.
do $$
declare
  v_profile_id uuid := '8ddbc21c-8b48-4112-a517-073e359e0a33';
  v_mobile text := '9455062648';
  v_profile_role text;
  v_profile_name text;
  v_profile_email text;
  v_existing_customer_id uuid;
  v_id_collision_mobile text;
begin
  select role, full_name, email
    into v_profile_role, v_profile_name, v_profile_email
  from public.profiles
  where id = v_profile_id;

  if v_profile_id is null or v_profile_role is null then
    raise notice 'PIN identity repair skipped: profile % missing', v_profile_id;
    return;
  end if;

  if lower(coalesce(v_profile_role, '')) <> 'customer' then
    raise notice 'PIN identity repair skipped: profile role is %', v_profile_role;
    return;
  end if;

  select id into v_existing_customer_id
  from public.customers
  where mobile in (v_mobile, '91' || v_mobile, '+91' || v_mobile, '0' || v_mobile)
  limit 1;

  if v_existing_customer_id is not null then
    update public.applications
       set customer_id = v_existing_customer_id
     where user_id = v_profile_id
       and customer_mobile in (v_mobile, '91' || v_mobile, '+91' || v_mobile, '0' || v_mobile)
       and (customer_id is distinct from v_existing_customer_id);
    raise notice 'PIN identity repair: customer already exists %', v_existing_customer_id;
    return;
  end if;

  select mobile into v_id_collision_mobile
  from public.customers
  where id = v_profile_id;

  if v_id_collision_mobile is not null
     and regexp_replace(v_id_collision_mobile, '\D', '', 'g') not like '%' || v_mobile
  then
    raise notice 'PIN identity repair skipped: customers.id collision with other mobile';
    return;
  end if;

  insert into public.customers (id, mobile, name, email, is_active, hashed_pin)
  values (
    v_profile_id,
    v_mobile,
    coalesce(nullif(btrim(v_profile_name), ''), 'Customer'),
    coalesce(v_profile_email, ''),
    true,
    null
  )
  on conflict (id) do update
    set mobile = excluded.mobile,
        name = coalesce(nullif(btrim(public.customers.name), ''), excluded.name),
        is_active = true;

  update public.applications
     set customer_id = v_profile_id
   where user_id = v_profile_id
     and customer_mobile in (v_mobile, '91' || v_mobile, '+91' || v_mobile, '0' || v_mobile);

  raise notice 'PIN identity repair completed for mobile ****% ', right(v_mobile, 4);
end
$$;
