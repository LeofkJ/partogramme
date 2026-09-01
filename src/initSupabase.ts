import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { Database } from "../types/supabase";
import {SUPABASEURL, SUPABASEKEY} from "@env"
import { logger } from "./lib/logger";

const supabaseUrl = SUPABASEURL
const supabaseKey = SUPABASEKEY

// Bounds every Supabase request (auth + REST) so a request never hangs
// indefinitely on a bad connection — plain fetch has no default timeout.
// Chains any caller-supplied signal so aborting either one aborts the
// fetch. Doesn't affect realtime (websocket, not fetch).
const REQUEST_TIMEOUT_MS = 20000;

const loggedFetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const method = options?.method || "GET";
  const path = url.toString().replace(supabaseUrl, "");
  logger.debug(`→ ${method} ${path}`);
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  options?.signal?.addEventListener("abort", () => controller.abort());
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const duration = Date.now() - start;
    const level = response.ok ? "debug" : "warn";
    logger[level](`← ${response.status} ${path} (${duration}ms)`);
    return response;
  } catch (error: any) {
    const duration = Date.now() - start;
    if (error?.name === "AbortError") {
      logger.warn(`✗ TIMEOUT ${path} (${duration}ms)`);
      throw new Error("La requête a expiré. Vérifiez votre connexion internet.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
        storage: AsyncStorage as any,
        persistSession: true,
        autoRefreshToken: true,
        // Web only: needed if a URL ever carries a session token in its
        // fragment (magic link, invite, etc). Native has no deep-link
        // handling for this yet, so it stays off there. Currently unused —
        // account creation no longer sends invite links — but harmless to
        // leave on for whenever a link-based auth flow shows up again.
        detectSessionInUrl: Platform.OS === "web",
    },
    global: { fetch: loggedFetch },
});

supabase.auth.onAuthStateChange((event, session) => {
  logger.info(`Auth: ${event}`, { userId: session?.user?.id });
});