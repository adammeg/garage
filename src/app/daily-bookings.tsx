import { useEffect, useState } from "react";
import Link from "next/link";
import { isGarageClosed } from "@/lib/appointment-times";
import type { DailySchedule } from "@/lib/daily-schedule";
import VehicleStatusDot from "./vehicle-status-dot";
import styles from "./daily-bookings.module.css";

const dateLabel = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" });

export default function DailyBookings() {
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [copied, setCopied] = useState(false);

  async function copyBookingLink() {
    const url = new URL("/appointments", window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copiez le lien de réservation", url);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    async function refresh() {
      if (loading || document.hidden) return;
      loading = true;
      try {
        const response = await fetch("/api/appointments/today", { cache: "no-store", signal: controller.signal });
        if (controller.signal.aborted) return;
        if (response.status === 401) {
          setSchedule(null);
          window.location.replace("/connexion");
          return;
        }
        if (!response.ok) throw new Error("Planning indisponible");
        const data: DailySchedule = await response.json();
        if (!controller.signal.aborted) { setSchedule(data); setFailed(false); }
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        loading = false;
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [retry]);

  return <section className={styles.panel} aria-labelledby="daily-bookings-title">
    <header className={styles.heading}>
      <h2 id="daily-bookings-title">Planning des rendez-vous du jour</h2>
      {schedule && <p>{dateLabel.format(new Date(schedule.date + "T00:00:00Z"))} · Heure de Tunis</p>}
    </header>
    <div className={styles.share}>
      <Link href="/appointments">Prendre rendez-vous</Link>
      <button type="button" onClick={copyBookingLink}>Copier le lien</button>
      <span role="status">{copied && "Lien copié"}</span>
    </div>
    {failed && <p role="alert" className={styles.message}>
      Impossible d’actualiser le planning. <button type="button" onClick={() => setRetry(value => value + 1)}>Réessayer</button>
    </p>}
    {!schedule && !failed && <p className={styles.message} role="status">Chargement du planning…</p>}
    {schedule && (schedule.bookings.length ? <ol className={styles.bookings} translate="no">
      {schedule.bookings.map(booking => <li key={booking.slot}>
        <time dateTime={booking.slot}>{booking.slot.slice(11)}</time>
        <div><strong>{booking.status && <VehicleStatusDot status={booking.status} />}{booking.plate}</strong><small>{booking.model}</small></div>
        <p>{booking.reason || "Motif non renseigné"}</p>
      </li>)}
    </ol> : <p className={styles.message}>{isGarageClosed(schedule.date)
      ? "Le garage est fermé le dimanche." : "Aucun rendez-vous prévu aujourd’hui."}</p>)}
  </section>;
}
