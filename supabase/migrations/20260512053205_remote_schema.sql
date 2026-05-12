drop extension if exists "pg_net";

drop policy "Admins manage service categories" on "public"."service_categories";

drop policy "Public read active service categories" on "public"."service_categories";

drop policy "Admins manage services" on "public"."services";

drop policy "Public read published services" on "public"."services";

revoke delete on table "public"."service_categories" from "anon";

revoke insert on table "public"."service_categories" from "anon";

revoke references on table "public"."service_categories" from "anon";

revoke select on table "public"."service_categories" from "anon";

revoke trigger on table "public"."service_categories" from "anon";

revoke truncate on table "public"."service_categories" from "anon";

revoke update on table "public"."service_categories" from "anon";

revoke delete on table "public"."service_categories" from "authenticated";

revoke insert on table "public"."service_categories" from "authenticated";

revoke references on table "public"."service_categories" from "authenticated";

revoke select on table "public"."service_categories" from "authenticated";

revoke trigger on table "public"."service_categories" from "authenticated";

revoke truncate on table "public"."service_categories" from "authenticated";

revoke update on table "public"."service_categories" from "authenticated";

revoke delete on table "public"."service_categories" from "service_role";

revoke insert on table "public"."service_categories" from "service_role";

revoke references on table "public"."service_categories" from "service_role";

revoke select on table "public"."service_categories" from "service_role";

revoke trigger on table "public"."service_categories" from "service_role";

revoke truncate on table "public"."service_categories" from "service_role";

revoke update on table "public"."service_categories" from "service_role";

alter table "public"."profiles" drop constraint "profiles_commission_type_check";

alter table "public"."service_categories" drop constraint "service_categories_slug_key";

alter table "public"."services" drop constraint "services_category_id_fkey";

alter table "public"."services" drop constraint "services_cta_type_check";

alter table "public"."services" drop constraint "services_status_check";

alter table "public"."service_categories" drop constraint "service_categories_pkey";

drop index if exists "public"."profiles_agent_code_unique_idx";

drop index if exists "public"."service_categories_active_sort_idx";

drop index if exists "public"."service_categories_pkey";

drop index if exists "public"."service_categories_slug_key";

drop index if exists "public"."services_category_status_idx";

drop index if exists "public"."services_slug_idx";

drop index if exists "public"."services_status_sort_idx";

drop table "public"."service_categories";

alter table "public"."profiles" alter column "role" drop default;

alter type "public"."app_role" rename to "app_role__old_version_to_be_dropped";

create type "public"."app_role" as enum ('super_admin', 'admin', 'agent', 'customer', 'staff');


  create table "public"."admin_notes" (
    "id" uuid not null default gen_random_uuid(),
    "application_id" uuid not null,
    "admin_id" uuid,
    "note" text not null,
    "assigned_to" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."admin_notes" enable row level security;


  create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "application_id" uuid,
    "title" text not null,
    "message" text not null,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."notifications" enable row level security;


  create table "public"."ratings" (
    "id" uuid not null default gen_random_uuid(),
    "application_id" uuid not null,
    "user_id" uuid not null,
    "rating" integer not null,
    "feedback" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ratings" enable row level security;

alter table "public"."profiles" alter column role type "public"."app_role" using role::text::"public"."app_role";

alter table "public"."profiles" alter column "role" set default 'customer'::public.app_role;

drop type "public"."app_role__old_version_to_be_dropped";

alter table "public"."leads" alter column "created_at" drop not null;

alter table "public"."leads" alter column "message" drop default;

alter table "public"."payments" enable row level security;

alter table "public"."profiles" drop column "agent_code";

alter table "public"."profiles" drop column "commission_type";

alter table "public"."profiles" drop column "commission_value";

alter table "public"."profiles" drop column "is_active";

alter table "public"."profiles" add column "avatar_url" text default ''::text;

alter table "public"."profiles" alter column "email" set not null;

alter table "public"."profiles" alter column "full_name" set default ''::text;

alter table "public"."services" drop column "badge";

alter table "public"."services" drop column "benefits";

alter table "public"."services" drop column "blog_content";

alter table "public"."services" drop column "category_id";

alter table "public"."services" drop column "cta_type";

alter table "public"."services" drop column "documents";

alter table "public"."services" drop column "faqs";

alter table "public"."services" drop column "featured";

alter table "public"."services" drop column "icon";

alter table "public"."services" drop column "offer_price";

alter table "public"."services" drop column "old_price";

alter table "public"."services" drop column "overview";

alter table "public"."services" drop column "price_label";

alter table "public"."services" drop column "process";

alter table "public"."services" drop column "reviews";

alter table "public"."services" drop column "seo_description";

alter table "public"."services" drop column "seo_keywords";

alter table "public"."services" drop column "seo_title";

alter table "public"."services" drop column "short_description";

alter table "public"."services" drop column "sort_order";

alter table "public"."services" drop column "status";

alter table "public"."services" drop column "title";

alter table "public"."services" drop column "updated_at";

alter table "public"."services" alter column "name" drop default;

alter table "public"."users" enable row level security;

CREATE INDEX admin_notes_application_idx ON public.admin_notes USING btree (application_id);

CREATE UNIQUE INDEX admin_notes_pkey ON public.admin_notes USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE INDEX notifications_user_idx ON public.notifications USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX ratings_application_id_user_id_key ON public.ratings USING btree (application_id, user_id);

CREATE UNIQUE INDEX ratings_pkey ON public.ratings USING btree (id);

CREATE INDEX ratings_user_idx ON public.ratings USING btree (user_id, created_at DESC);

alter table "public"."admin_notes" add constraint "admin_notes_pkey" PRIMARY KEY using index "admin_notes_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."ratings" add constraint "ratings_pkey" PRIMARY KEY using index "ratings_pkey";

alter table "public"."admin_notes" add constraint "admin_notes_admin_id_fkey" FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."admin_notes" validate constraint "admin_notes_admin_id_fkey";

alter table "public"."admin_notes" add constraint "admin_notes_application_id_fkey" FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE not valid;

alter table "public"."admin_notes" validate constraint "admin_notes_application_id_fkey";

alter table "public"."notifications" add constraint "notifications_application_id_fkey" FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_application_id_fkey";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."ratings" add constraint "ratings_application_id_fkey" FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE not valid;

alter table "public"."ratings" validate constraint "ratings_application_id_fkey";

alter table "public"."ratings" add constraint "ratings_application_id_user_id_key" UNIQUE using index "ratings_application_id_user_id_key";

alter table "public"."ratings" add constraint "ratings_rating_check" CHECK (((rating >= 1) AND (rating <= 5))) not valid;

alter table "public"."ratings" validate constraint "ratings_rating_check";

alter table "public"."ratings" add constraint "ratings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."ratings" validate constraint "ratings_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(p_user_id uuid, p_amount numeric, p_transaction_type text, p_note text, p_created_by uuid DEFAULT NULL::uuid, p_expiry_days integer DEFAULT 90)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_wallet public.wallets;
  v_transaction_id uuid;
  v_direction text;
  v_remaining numeric(10, 2);
  v_credit record;
begin
  if p_user_id is null or coalesce(p_amount, 0) = 0 then
    raise exception 'User and non-zero amount are required.';
  end if;

  if p_transaction_type not in ('admin_bonus', 'refund_adjustment') then
    raise exception 'Invalid admin wallet transaction type.';
  end if;

  v_wallet := public.refresh_wallet_summary(p_user_id);
  v_direction := case when p_amount > 0 then 'credit' else 'debit' end;

  if v_direction = 'debit' and abs(p_amount) > v_wallet.balance then
    raise exception 'Adjustment would create a negative wallet balance.';
  end if;

  if v_direction = 'credit' then
    insert into public.wallet_transactions (
      wallet_id, user_id, transaction_type, direction, amount, remaining_amount,
      service_name, note, status, expires_at, created_by
    )
    values (
      v_wallet.id, p_user_id, p_transaction_type, 'credit', round(abs(p_amount), 2), round(abs(p_amount), 2),
      'Admin Wallet Adjustment', coalesce(p_note, 'Admin wallet credit.'), 'active',
      now() + make_interval(days => greatest(coalesce(p_expiry_days, 90), 1)), p_created_by
    )
    returning id into v_transaction_id;
  else
    v_remaining := round(abs(p_amount), 2);

    for v_credit in
      select id, remaining_amount
      from public.wallet_transactions
      where user_id = p_user_id
        and direction = 'credit'
        and status = 'active'
        and remaining_amount > 0
        and (expires_at is null or expires_at > now())
      order by expires_at asc nulls last, created_at asc
    loop
      exit when v_remaining <= 0;

      update public.wallet_transactions
      set remaining_amount = greatest(remaining_amount - least(remaining_amount, v_remaining), 0),
          status = case when greatest(remaining_amount - least(remaining_amount, v_remaining), 0) = 0 then 'used' else status end
      where id = v_credit.id;

      v_remaining := v_remaining - least(v_credit.remaining_amount, v_remaining);
    end loop;

    if v_remaining > 0 then
      raise exception 'Insufficient unexpired DigiWallet balance.';
    end if;

    insert into public.wallet_transactions (
      wallet_id, user_id, transaction_type, direction, amount, remaining_amount,
      service_name, note, status, created_by
    )
    values (
      v_wallet.id, p_user_id, p_transaction_type, 'debit', round(abs(p_amount), 2), 0,
      'Admin Wallet Adjustment', coalesce(p_note, 'Admin wallet debit.'), 'used', p_created_by
    )
    returning id into v_transaction_id;
  end if;

  perform public.refresh_wallet_summary(p_user_id);
  return v_transaction_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.credit_wallet_cashback(p_user_id uuid, p_application_id uuid, p_service_name text, p_order_amount numeric, p_cashback_amount numeric, p_expiry_days integer, p_created_by uuid DEFAULT NULL::uuid, p_campaign_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_wallet public.wallets;
  v_transaction_id uuid;
  v_expires_at timestamptz;
begin
  if p_user_id is null or p_application_id is null then
    raise exception 'User and application are required.';
  end if;

  if coalesce(p_cashback_amount, 0) <= 0 then
    raise exception 'Cashback amount must be greater than zero.';
  end if;

  if exists (select 1 from public.cashback_history where application_id = p_application_id) then
    return null;
  end if;

  v_wallet := public.refresh_wallet_summary(p_user_id);
  v_expires_at := now() + make_interval(days => greatest(coalesce(p_expiry_days, 90), 1));

  insert into public.wallet_transactions (
    wallet_id, user_id, application_id, campaign_id, transaction_type, direction,
    amount, remaining_amount, service_name, note, status, expires_at, created_by
  )
  values (
    v_wallet.id, p_user_id, p_application_id, p_campaign_id, 'cashback_credit', 'credit',
    round(p_cashback_amount, 2), round(p_cashback_amount, 2), p_service_name,
    '100% DigiWallet cashback credited after successful service completion.', 'active', v_expires_at, p_created_by
  )
  returning id into v_transaction_id;

  insert into public.cashback_history (
    user_id, application_id, campaign_id, wallet_transaction_id, service_name,
    order_amount, cashback_amount, expires_at
  )
  values (
    p_user_id, p_application_id, p_campaign_id, v_transaction_id, coalesce(p_service_name, 'Service'),
    round(coalesce(p_order_amount, 0), 2), round(p_cashback_amount, 2), v_expires_at
  );

  perform public.refresh_wallet_summary(p_user_id);
  return v_transaction_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.current_app_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select p.role::text from public.profiles p where p.id = auth.uid()),
    (select u.role from public.users u where u.id = auth.uid()),
    'customer'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.current_app_role() in ('super_admin', 'admin');
$function$
;

CREATE OR REPLACE FUNCTION public.is_staff_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.current_app_role() = 'staff';
$function$
;

CREATE OR REPLACE FUNCTION public.redeem_wallet_balance(p_user_id uuid, p_application_id uuid, p_service_name text, p_order_amount numeric, p_requested_amount numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_wallet public.wallets;
  v_max_allowed numeric(10, 2);
  v_to_redeem numeric(10, 2);
  v_remaining numeric(10, 2);
  v_credit record;
begin
  if coalesce(p_requested_amount, 0) <= 0 then
    return 0;
  end if;

  if p_user_id is null or p_application_id is null then
    raise exception 'User and application are required.';
  end if;

  if coalesce(p_order_amount, 0) <= 0 then
    raise exception 'Order amount must be greater than zero.';
  end if;

  v_wallet := public.refresh_wallet_summary(p_user_id);
  v_max_allowed := round(p_order_amount * 0.50, 2);
  v_to_redeem := least(round(p_requested_amount, 2), v_max_allowed, v_wallet.balance);

  if v_to_redeem <= 0 then
    return 0;
  end if;

  if round(p_requested_amount, 2) > v_max_allowed then
    raise exception 'Wallet can be used for maximum 50%% of order value.';
  end if;

  if round(p_requested_amount, 2) > v_wallet.balance then
    raise exception 'Insufficient DigiWallet balance.';
  end if;

  v_remaining := v_to_redeem;

  for v_credit in
    select id, remaining_amount
    from public.wallet_transactions
    where user_id = p_user_id
      and direction = 'credit'
      and status = 'active'
      and remaining_amount > 0
      and (expires_at is null or expires_at > now())
    order by expires_at asc nulls last, created_at asc
  loop
    exit when v_remaining <= 0;

    update public.wallet_transactions
    set remaining_amount = greatest(remaining_amount - least(remaining_amount, v_remaining), 0),
        status = case when greatest(remaining_amount - least(remaining_amount, v_remaining), 0) = 0 then 'used' else status end
    where id = v_credit.id;

    v_remaining := v_remaining - least(v_credit.remaining_amount, v_remaining);
  end loop;

  if v_remaining > 0 then
    raise exception 'Insufficient unexpired DigiWallet balance.';
  end if;

  insert into public.wallet_transactions (
    wallet_id, user_id, application_id, transaction_type, direction,
    amount, remaining_amount, service_name, note, status
  )
  values (
    v_wallet.id, p_user_id, p_application_id, 'wallet_usage', 'debit',
    v_to_redeem, 0, p_service_name, 'DigiWallet used for future eligible service.', 'used'
  );

  perform public.refresh_wallet_summary(p_user_id);
  return v_to_redeem;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_wallet_summary(p_user_id uuid)
 RETURNS public.wallets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_wallet public.wallets;
  v_balance numeric(10, 2);
  v_earned numeric(10, 2);
  v_used numeric(10, 2);
  v_expiry timestamptz;
begin
  insert into public.wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  update public.wallet_transactions
  set status = 'expired', remaining_amount = 0
  where user_id = p_user_id
    and direction = 'credit'
    and status = 'active'
    and expires_at is not null
    and expires_at <= now();

  select
    coalesce(sum(remaining_amount) filter (where direction = 'credit' and status = 'active' and (expires_at is null or expires_at > now())), 0),
    coalesce(sum(amount) filter (where transaction_type in ('cashback_credit', 'admin_bonus') and direction = 'credit'), 0),
    coalesce(sum(amount) filter (where transaction_type = 'wallet_usage' and direction = 'debit'), 0),
    min(expires_at) filter (where direction = 'credit' and status = 'active' and remaining_amount > 0 and expires_at > now())
  into v_balance, v_earned, v_used, v_expiry
  from public.wallet_transactions
  where user_id = p_user_id;

  update public.wallets
  set balance = v_balance,
      total_cashback_earned = v_earned,
      total_cashback_used = v_used,
      nearest_expiry_at = v_expiry,
      updated_at = now()
  where user_id = p_user_id
  returning * into v_wallet;

  return v_wallet;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_customer_profiles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

grant delete on table "public"."admin_notes" to "anon";

grant insert on table "public"."admin_notes" to "anon";

grant references on table "public"."admin_notes" to "anon";

grant select on table "public"."admin_notes" to "anon";

grant trigger on table "public"."admin_notes" to "anon";

grant truncate on table "public"."admin_notes" to "anon";

grant update on table "public"."admin_notes" to "anon";

grant delete on table "public"."admin_notes" to "authenticated";

grant insert on table "public"."admin_notes" to "authenticated";

grant references on table "public"."admin_notes" to "authenticated";

grant select on table "public"."admin_notes" to "authenticated";

grant trigger on table "public"."admin_notes" to "authenticated";

grant truncate on table "public"."admin_notes" to "authenticated";

grant update on table "public"."admin_notes" to "authenticated";

grant delete on table "public"."admin_notes" to "service_role";

grant insert on table "public"."admin_notes" to "service_role";

grant references on table "public"."admin_notes" to "service_role";

grant select on table "public"."admin_notes" to "service_role";

grant trigger on table "public"."admin_notes" to "service_role";

grant truncate on table "public"."admin_notes" to "service_role";

grant update on table "public"."admin_notes" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."ratings" to "anon";

grant insert on table "public"."ratings" to "anon";

grant references on table "public"."ratings" to "anon";

grant select on table "public"."ratings" to "anon";

grant trigger on table "public"."ratings" to "anon";

grant truncate on table "public"."ratings" to "anon";

grant update on table "public"."ratings" to "anon";

grant delete on table "public"."ratings" to "authenticated";

grant insert on table "public"."ratings" to "authenticated";

grant references on table "public"."ratings" to "authenticated";

grant select on table "public"."ratings" to "authenticated";

grant trigger on table "public"."ratings" to "authenticated";

grant truncate on table "public"."ratings" to "authenticated";

grant update on table "public"."ratings" to "authenticated";

grant delete on table "public"."ratings" to "service_role";

grant insert on table "public"."ratings" to "service_role";

grant references on table "public"."ratings" to "service_role";

grant select on table "public"."ratings" to "service_role";

grant trigger on table "public"."ratings" to "service_role";

grant truncate on table "public"."ratings" to "service_role";

grant update on table "public"."ratings" to "service_role";


  create policy "Admin notes full access"
  on "public"."admin_notes"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Allow Public Insert"
  on "public"."application_documents"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "Customers can read own documents"
  on "public"."application_documents"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Allow Public Insert"
  on "public"."applications"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "Allow Public Select"
  on "public"."applications"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Customers can create own applications"
  on "public"."applications"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Customers can read own applications"
  on "public"."applications"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Customers can read own invoices"
  on "public"."invoices"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Allow authenticated read leads"
  on "public"."leads"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow authenticated update leads"
  on "public"."leads"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Allow lead insert"
  on "public"."leads"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "Allow Public Insert"
  on "public"."notifications"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "Customers can read own notifications"
  on "public"."notifications"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Customers can read own payments"
  on "public"."payments"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Customers can rate completed own applications"
  on "public"."ratings"
  as permissive
  for insert
  to public
with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.applications
  WHERE ((applications.id = ratings.application_id) AND (applications.user_id = auth.uid()) AND (applications.status = 'completed'::text))))));



  create policy "Customers can read own ratings"
  on "public"."ratings"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Anyone can read active services"
  on "public"."services"
  as permissive
  for select
  to public
using ((active = true));



  create policy "Users can read own profile"
  on "public"."users"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Users can update own profile"
  on "public"."users"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Authenticated users can read documents"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'documents'::text));



  create policy "Authenticated users can upload documents"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Public can read documents bucket"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'documents'::text));



  create policy "Public can upload lead files"
  on "storage"."objects"
  as permissive
  for insert
  to anon
with check (((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = 'public-leads'::text)));



