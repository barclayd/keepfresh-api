import type { SupabaseClient } from '@supabase/supabase-js';
import type { Environment } from '@/types';
import type { Database } from '@/types/database';

export type HonoEnvironment = {
  Variables: {
    environment: Environment;
    supabase: SupabaseClient<Database>;
  };
};
