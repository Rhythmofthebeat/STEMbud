-- handle_new_user() is SECURITY DEFINER and only meant to run via the
-- on_auth_user_created trigger — block it from being called directly
-- through the public REST API (/rest/v1/rpc/handle_new_user).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
