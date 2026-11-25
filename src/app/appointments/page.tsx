import { Suspense } from "react";
import { connection } from "next/server";
import { garageLocalTime } from "@/lib/appointment-times";
import AppointmentBooking from "../vehicle/[id]/appointment-booking";
import styles from "../vehicle/[id]/vehicle.module.css";

export const metadata = { title: "Prendre rendez-vous | Atelier" };

async function PublicBooking() {
  await connection();
  return <AppointmentBooking today={garageLocalTime().slice(0, 10)} />;
}

export default function AppointmentsPage() {
  return <main className={styles.page}>
    <header className={styles.header}><span className={styles.brand} role="img" aria-label="Atelier" /></header>
    <Suspense fallback={<p className={styles.loading}>Chargement des disponibilités…</p>}>
      <PublicBooking />
    </Suspense>
  </main>;
}
