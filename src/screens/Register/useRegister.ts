import { useState } from "react";
import { supabase } from "../../initSupabase";
import { rootStore } from "../../store/rootStore";

/** Register screen logic, shared by every platform variant of the screen. */
export function useRegister(onRegistered: () => void) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async () => {
    setErrorMessage(null);

    if (email === "" || password === "" || confirmPassword === "") {
      setErrorMessage("Veuillez remplir tous les champs.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      setIsSubmitting(false);
      const msg = error.message.toLowerCase();
      let friendly = "";
      if (msg.includes("already registered") || msg.includes("user already exists") || msg.includes("already exists")) {
        friendly = "Un compte existe déjà avec cet email.";
      } else if (msg.includes("invalid email") || msg.includes("unable to validate email")) {
        friendly = "Adresse email invalide.";
      } else if (msg.includes("password") || msg.includes("weak password")) {
        friendly = "Le mot de passe ne respecte pas les critères requis (minimum 6 caractères).";
      } else if (msg.includes("too many requests") || msg.includes("rate limit") || (error as any)?.status === 429) {
        friendly = "Trop de tentatives. Veuillez réessayer dans quelques minutes.";
      } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
        friendly = "Pas de connexion internet. Vérifiez votre réseau.";
      } else if (msg.includes("signup") && msg.includes("disabled")) {
        friendly = "La création de compte est temporairement désactivée.";
      } else {
        friendly = "Erreur lors de la création du compte. Veuillez réessayer.";
      }
      setErrorMessage(friendly);
      return;
    }

    if (data.session) {
      const { error: profileError } = await supabase
        .from("Profile")
        .upsert({ id: data.user!.id, email: email, isDeleted: false });
      if (profileError) {
        setIsSubmitting(false);
        setErrorMessage("Compte créé mais erreur lors de la configuration du profil. Veuillez réessayer.");
        return;
      }
      rootStore.profileStore.setProfileEmail(email);
      rootStore.profileStore.setProfileId(data.user!.id);
      setIsSubmitting(false);
      onRegistered();
    } else if (data.user && !data.session) {
      setIsSubmitting(false);
      setErrorMessage("Un lien de confirmation a été envoyé à " + email + ". Veuillez confirmer votre email avant de vous connecter.");
    } else {
      setIsSubmitting(false);
      setErrorMessage("Impossible de créer le compte. Veuillez réessayer.");
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    errorMessage,
    isSubmitting,
    submit,
  };
}
