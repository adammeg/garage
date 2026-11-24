import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { idFilter } from "@/lib/garage";
import { garageLocalTime } from "@/lib/appointment-times";
import { getDatabase } from "@/lib/mongodb";
import AppointmentBooking from "../appointment-booking";
import styles from "../vehicle.module.css";

export const metadata = { title: "Prendre rendez-vous | Atelier" };

type Props = Pick<PageProps<"/vehicle/[id]/appointments">, "params">;

async function VehicleBooking({ params }: Props) {
  const { id } = await params;
  const filter = idFilter(id);
  if (!filter) notFound();
  await connection();
  const vehicles = (await getDatabase()).collection<{ plate: string }>("vehicles");
  const vehicle = await vehicles.findOne(filter, { projection: { plate: 1 } });
  if (!vehicle) notFound();

  return <>
    <header className={styles.header}>
      <span className={styles.brand} role="img" aria-label="Atelier" />
      <Link className={styles.backLink} href={`/vehicle/${id}`}>
        <ArrowLeft size={16} aria-hidden="true" /> Fiche du véhicule
      </Link>
    </header>
    <AppointmentBooking key={id} vehicleId={id} plate={vehicle.plate} today={garageLocalTime().slice(0, 10)} />
  </>;
}

export default function AppointmentsPage({ params }: Props) {
  return <main className={styles.page}>
    <Suspense fallback={<p className={styles.loading}>Chargement du véhicule…</p>}>
      <VehicleBooking params={params} />
    </Suspense>
  </main>;
}
