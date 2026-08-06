import { useEffect, useState } from "react";
import { rootStore } from "../../store/rootStore";
import { supabase } from "../../initSupabase";
import { logger } from "../../lib/logger";

/**
 * Login screen logic, shared by every platform variant of the screen
 * (ARCHITECTURE.md §2). UI files render what this returns and nothing more.
 */
export function useLogin(onLoggedIn: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Clear any previous user's data before the new session's data is fetched,
    // so a different user logging in on the same device never sees stale
    // partogrammes/info left over from the last session.
    //
    // This listener never actually unmounts — Login stays mounted under
    // Menu forever (see Login.tsx: `navigation.navigate`, not `reset`), so
    // it's still live for the rest of the session. Supabase re-fires
    // SIGNED_IN whenever the browser tab regains focus and revalidates an
    // already-valid session — same user, same session, nothing changed —
    // so treating every SIGNED_IN as "a new login happened" was wiping both
    // stores on every single tab switch. Only wipe when the session's user
    // actually differs from whichever profile is currently loaded.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        rootStore.partogrammeStore.cleanUp();
        rootStore.userInfoStore.cleanUp();
        return;
      }
      if (event === "SIGNED_IN") {
        const previousProfileId = rootStore.userInfoStore.userInfo.profileId;
        if (previousProfileId && session?.user?.id && session.user.id !== previousProfileId) {
          rootStore.partogrammeStore.cleanUp();
          rootStore.userInfoStore.cleanUp();
        }
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    logger.info("Login attempt", { email: rootStore.profileStore.email });
    rootStore.profileStore
      .signInWithEmail(
        rootStore.profileStore.email,
        rootStore.profileStore.password,
      )
      .then((result) => {
        if (result) {
          logger.info("Login success", { email: rootStore.profileStore.email });
          onLoggedIn();
        }
        setIsSubmitting(false);
      })
      .catch((error) => {
        logger.warn("Login failed", {
          email: rootStore.profileStore.email,
          reason: error?.message,
        });
        setIsSubmitting(false);
        const msg = (error?.message || "").toLowerCase();
        let friendly = "";
        if (
          msg.includes("invalid login credentials") ||
          msg.includes("user not found") ||
          msg.includes("invalid email")
        ) {
          friendly = "Email introuvable ou mot de passe incorrect.";
        } else if (msg.includes("email not confirmed")) {
          friendly = "Veuillez confirmer votre email avant de vous connecter.";
        } else if (
          msg.includes("too many requests") ||
          msg.includes("rate limit") ||
          error?.status === 429
        ) {
          friendly = "Trop de tentatives. Veuillez réessayer dans quelques minutes.";
        } else if (
          msg.includes("network") ||
          msg.includes("fetch") ||
          msg.includes("failed to fetch")
        ) {
          friendly = "Pas de connexion internet. Vérifiez votre réseau.";
        } else if (msg.includes("disabled") || msg.includes("not enabled")) {
          friendly = "Ce compte a été désactivé. Contactez l'administrateur.";
        } else {
          friendly = "Erreur de connexion. Veuillez réessayer.";
        }
        setErrorMessage(friendly);
      });
  };

  return {
    email: rootStore.profileStore.email,
    password: rootStore.profileStore.password,
    setEmail: (value: string) => rootStore.profileStore.setProfileEmail(value),
    setPassword: (value: string) => rootStore.profileStore.setPassword(value),
    errorMessage,
    isSubmitting,
    submit,
  };
}
