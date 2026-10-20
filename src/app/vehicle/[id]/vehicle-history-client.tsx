"use client";

import { use, useEffect, useState } from "react";
import { CarFront, CircleAlert, Clock3, Wrench } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import styles from "./vehicle.module.css";
import FrenchInterface from "../../french-interface";

type Service = { id: string; date: string; kind: string; mileage: number; notes: string; mechanic: string };
type Vehicle = { id: string; plate: string; make: string; model: string; year: number; mileage: number; nextOil: number; history: Service[] };

export default function VehicleHistoryClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/vehicles/${id}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setVehicle(data?.vehicle ?? null))
      .catch(() => setVehicle(null))
      .finally(() => setLoaded(true));
    return () => controller.abort();
  }, [id]);

  if (!loaded) return <main className={styles.page}><span className={styles.loading}>Chargement de la fiche d&apos;entretien...</span></main>;
  if (!vehicle) return <main className={styles.page}><section className={styles.missing}><span className={styles.brand}><Wrench size={18} /> ATELIER</span><CircleAlert size={27} /><h1>Fiche indisponible</h1><p>Ce code QR ne correspond à aucun véhicule enregistré.</p></section></main>;

  return <FrenchInterface><main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.brand}><span className={styles.brandIcon}><Wrench size={17} /></span><span>ATELIER<small>GARAGE SERVICE RECORD</small></span></Link><span className={styles.publicLabel}>CUSTOMER COPY</span></header>
    <section className={styles.hero}><div className={styles.eyebrow}>DIGITAL MAINTENANCE RECORD</div><div className={styles.vehicleTitle}><span className={styles.carIcon}><CarFront size={26} /></span><div><span>{vehicle.plate}</span><h1>{vehicle.make} {vehicle.model}</h1><p>{vehicle.year} model · Tunis</p></div></div></section>
    <section className={styles.nextService}><div><span className={styles.sectionLabel}><Clock3 size={14} /> NEXT OIL CHANGE</span><strong>{new Intl.NumberFormat("en-US").format(vehicle.nextOil)} <small>km</small></strong><p><CircleAlert size={14} /> {new Intl.NumberFormat("en-US").format(Math.max(0, vehicle.nextOil - vehicle.mileage))} km remaining</p></div><div className={styles.qr}><QRCodeSVG value={window.location.href} size={88} includeMargin /></div></section>
    <section className={styles.history}><div className={styles.historyHeading}><div><span className={styles.sectionLabel}>SERVICE TIMELINE</span><h2>Maintenance history</h2></div><span>{vehicle.history.length} visits</span></div>{vehicle.history.length ? vehicle.history.map((item) => <article className={styles.entry} key={item.id}><div className={styles.timeline}><i /></div><div className={styles.entryContent}><div className={styles.entryTop}><h3>{item.kind}</h3><time>{item.date}</time></div><p>{item.notes || "Service completed."}</p><span>{new Intl.NumberFormat("en-US").format(item.mileage)} km <i /> Serviced by {item.mechanic}</span></div></article>) : <div className={styles.empty}>No maintenance visits have been recorded yet.</div>}</section>
    <footer className={styles.footer}>ATELIER GARAGE <span>Vehicle maintenance record</span></footer>
  </main></FrenchInterface>;
}
