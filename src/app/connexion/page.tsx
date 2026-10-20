"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, KeyRound, Mail, ShieldCheck, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Impossible de vous connecter."); setPending(false); return; }
    router.replace("/"); router.refresh();
  }

  return <main className={styles.page}>
    <section className={styles.intro}><div className={styles.brand}><span><Wrench size={22} /></span> ATELIER</div><div><p className={styles.eyebrow}>GESTION D&apos;ATELIER</p><h1>Votre garage, <em>simplement piloté.</em></h1><p className={styles.copy}>Suivez les véhicules, les interventions et les entretiens depuis un espace sécurisé.</p></div><div className={styles.points}><span><ShieldCheck size={17} /> Accès par rôle</span><span><KeyRound size={17} /> Données protégées</span></div></section>
    <section className={styles.panel}><div className={styles.card}><div className={styles.cardHead}><span className={styles.icon}><Wrench size={21} /></span><div><p>ESPACE SÉCURISÉ</p><h2>Connexion</h2></div></div><p className={styles.description}>Connectez-vous avec les identifiants créés par l’administrateur du garage.</p>
      <form onSubmit={submit} className={styles.form}>
        <label>Adresse e-mail<div className={styles.input}><Mail size={17} /><input name="email" type="email" required autoComplete="email" placeholder="nom@garage.tn" /></div></label>
        <label>Mot de passe<div className={styles.input}><KeyRound size={17} /><input name="password" type="password" required minLength={8} autoComplete="current-password" placeholder="Votre mot de passe" /></div></label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.submit} disabled={pending}>{pending ? "Veuillez patienter…" : "Se connecter"}<ArrowRight size={17} /></button>
      </form>
    </div><p className={styles.footer}>ATELIER GARAGE · Gestion d&apos;atelier</p></section>
  </main>;
}
