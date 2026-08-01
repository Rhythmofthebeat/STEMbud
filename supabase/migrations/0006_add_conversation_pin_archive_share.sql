alter table public.conversations
  add column pinned boolean not null default false,
  add column archived boolean not null default false,
  add column share_token uuid unique;

create index conversations_share_token_idx on public.conversations (share_token) where share_token is not null;

-- Unguessable-link sharing: anyone with the token can read the conversation and its
-- messages, without signing in. The token itself (a random uuid) is the only gate ,
-- RLS just says "readable if shared", the client's own query supplies which token.
create policy "Anyone can view a conversation shared via token"
  on public.conversations for select
  to anon, authenticated
  using (share_token is not null);

create policy "Anyone can view messages of a conversation shared via token"
  on public.messages for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.share_token is not null
    )
  );
