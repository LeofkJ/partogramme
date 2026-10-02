import { useEffect, useState } from "react";
import { rootStore } from "../../store/rootStore";
import { supabase } from "../../lib/initSupabase";
import { logger } from "../../lib/logger";
import { notify } from "../../lib/notify";
import { navigationRef, reset } from "../../navigation/navigationRef";

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
      // A fresh subscription is delivered the current session state
      // immediately (as INITIAL_SESSION, even for subscriptions registered
      // long after boot) — and `reset()` below replaces the whole nav stack
      // with a brand-new route, which remounts Login even when it's already
      // the active screen, re-running this effect and creating a new
      // subscription. Without this guard, that new subscription immediately
      // gets its own INITIAL_SESSION/no-session delivery and resets again —
      // an infinite mount → reset → mount loop that pegs the CPU, replays
      // the screen-transition animation nonstop (the iOS "blinking" and the
      // onAnimatedValueUpdate spam), and drops every keystroke in the login
      // form since the TextInput never survives a render.
      const alreadyOnLogin =
        navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === "Screen_Login";
      if (event === "SIGNED_OUT") {
        rootStore.partogrammeStore.cleanUp();
        rootStore.userInfoStore.cleanUp();
        rootStore.alertBannerStore.signOut();
        rootStore.transferOutcomeStore.reset();
        // Covers a session dying mid-app (expired/failed refresh), not just
        // an explicit logout — those already navigate themselves (Profile.tsx,
        // NavBar.web.tsx), so only toast when this listener is the first to
        // notice (i.e. we're not already on the Login screen).
        if (!alreadyOnLogin) {
          notify.error("Session expirée", "Votre session a expiré. Veuillez vous reconnecter.");
          reset("Screen_Login");
        }
        return;
      }
      if (event === "SIGNED_IN") {
        const previousProfileId = rootStore.userInfoStore.userInfo.profileId;
        if (previousProfileId && session?.user?.id && session.user.id !== previousProfileId) {
          rootStore.partogrammeStore.cleanUp();
          rootStore.userInfoStore.cleanUp();
        }
      }
      // Fires once at boot with the result of checking AsyncStorage for a
      // stored session — session is null here when the refresh token is
      // dead (expired/revoked/not found), not just "never logged in".
      // Without this, a dev-client reload (or any restored deep link) that
      // lands somewhere other than the Login screen can be left holding a
      // stale persisted userInfoStore snapshot (mobx-persist-store, 24h
      // TTL) with no real session behind it, so a patient-list fetch fails
      // against RLS and shows a misleading "check your connection" error.
      // No toast — this is indistinguishable from a normal fresh install.
      if (event === "INITIAL_SESSION" && !session) {
        rootStore.partogrammeStore.cleanUp();
        rootStore.userInfoStore.cleanUp();
        if (!alreadyOnLogin) {
          reset("Screen_Login");
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
          rootStore.alertBannerStore.resetForLogin();
          const profileId = rootStore.profileStore.profile.id;
          if (profileId) {
            rootStore.transferOutcomeStore.checkOnBoot(profileId);
            rootStore.transferOutcomeStore.subscribe(profileId);
          }
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
