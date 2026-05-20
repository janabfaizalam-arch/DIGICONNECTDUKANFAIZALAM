-- Make application claiming safe for repaired signup accounts that do not yet
-- have a verified mobile number on their customer profile.

create or replace function public.claim_customer_applications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_mobile text;
  v_customer_id uuid;
  v_claimed integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select lower(coalesce(email, '')), regexp_replace(coalesce(mobile, ''), '\D', '', 'g')
    into v_email, v_mobile
  from public.profiles
  where id = v_user_id and role = 'customer';

  if v_email = '' or v_mobile = '' then
    return 0;
  end if;

  select id into v_customer_id
  from public.customers
  where user_id = v_user_id
  order by created_at asc
  limit 1;

  if v_customer_id is null then
    insert into public.customers(user_id, full_name, email, mobile, source)
    select id, coalesce(nullif(full_name, ''), 'Customer'), email, mobile, 'online'
    from public.profiles
    where id = v_user_id
    returning id into v_customer_id;
  end if;

  update public.applications
  set user_id = v_user_id,
      customer_id = v_customer_id,
      updated_at = now()
  where customer_id is null
    and lower(coalesce(customer_email, '')) = v_email
    and regexp_replace(coalesce(customer_mobile, ''), '\D', '', 'g') = v_mobile;

  get diagnostics v_claimed = row_count;
  return v_claimed;
end;
$$;
