import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";
import {SUPABASEURL, SUPABASEKEY} from "@env"

const supabaseUrl = SUPABASEURL
const supabaseKey = SUPABASEKEY

// Better put your these secret keys in .env file
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
        storage: AsyncStorage as any,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});