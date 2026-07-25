import { createClient } from '@supabase/supabase-js';

// Publishable (anon) key — safe to expose client-side, access is enforced by RLS policies.
const SUPABASE_URL = 'https://uwytwimfqpoxzafgglju.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Wxnk1mwo_Q5TBzjn-QuaUg_0HH8G69V';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
