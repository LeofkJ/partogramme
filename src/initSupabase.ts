import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";
import {SUPABASEURL, SUPABASEKEY} from "@env"
import { logger } from "./lib/logger";

const supabaseUrl = SUPABASEURL
const supabaseKey = SUPABASEKEY

const loggedFetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const method = options?.method || "GET";
  const path = url.toString().replace(supabaseUrl, "");
  logger.debug(`→ ${method} ${path}`);
  const start = Date.now();
  const response = await fetch(url, options);
  const duration = Date.now() - start;
  const level = response.ok ? "debug" : "warn";
  logger[level](`← ${response.status} ${path} (${duration}ms)`);
  return response;
};

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
        storage: AsyncStorage as any,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
    global: { fetch: loggedFetch },
});

supabase.auth.onAuthStateChange((event, session) => {
  logger.info(`Auth: ${event}`, { userId: session?.user?.id });
});