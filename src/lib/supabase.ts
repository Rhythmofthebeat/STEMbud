import { createClient } from '@supabase/supabase-js';

// Publishable (anon) key, safe to expose client-side, access is enforced by RLS policies.
const SUPABASE_URL = 'https://xjydqqhfbaskvfumdbjr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_pNwEPf2ZbnECRkBFFKuZJw_MtvgNKaT';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
