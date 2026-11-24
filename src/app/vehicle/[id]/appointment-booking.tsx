"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { isBookingDate } from "@/lib/appointment-times";
import styles from "./vehicle.module.css";

type Schedule = { available: string[]; upcoming: string[] };

const frenchDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long", timeZone: "UTC",
});

function describeSlot(slot: string) {
  return frenchDate.format(new Date(slot.slice(0, 10) + "T00:00:00Z")) + " à " + slot.slice(11);
}

type BookingProps = { vehicleId: string; plate: string; today: string };

export default function AppointmentBooking({ vehicleId, plate, today }: BookingProps) {
  const [date, setDate] = useState(today);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [selected, setSelected] = useState("");
  const [revision, setRevision] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const endpoint = `/api/vehicles/${vehicleId}/appointments`;
  const validDate = isBookingDate(date) && date >= today;

  useEffect(() => {
    if (!validDate) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(endpoint + "?date=" + date, {
          cache: "no-store", signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) setSchedule(data);
      } catch {
        if (!controller.signal.aborted) setLoadError("Impossible de charger les disponibilités.");
      }
    }
    void load();
    return () => controller.abort();
  }, [date, endpoint, revision, validDate]);

  function refresh() {
    setSelected("");
    setSchedule(null);
    setLoadError("");
    setRevision(value => value + 1);
  }

  async function book() {
    if (!selected || saving) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: selected }),
      });
      const data = await response.json();
      if (response.ok) {
        setNotice("Rendez-vous confirmé pour le " + describeSlot(data.slot) + ".");
      } else {
        setNotice(data.error || "Impossible de confirmer le rendez-vous.");
      }
    } catch {
      setNotice("Confirmation indisponible. Vérifiez vos rendez-vous avant de réessayer.");
    } finally {
      refresh();
      setSaving(false);
    }
  }

  return (
    <section className={styles.booking} aria-labelledby="booking-title">
      <h1 id="booking-title"><CalendarDays size={22} aria-hidden="true" /> Prendre rendez-vous</h1>
      <p>Immatriculation · <strong>{plate}</strong></p>
      <p>Du lundi au dimanche, de 9 h à 17 h · 30 minutes · Heure de Tunis</p>
      <label className={styles.bookingDate}>
        Date du rendez-vous
        <input type="date" value={date} min={today} disabled={saving} onChange={event => {
          setDate(event.target.value);
          setNotice("");
          refresh();
        }} />
      </label>
      <div role="status" className={styles.bookingMessage}>{notice}</div>
      {!validDate ? <p>Choisissez la date du jour ou une date ultérieure.</p>
        : loadError ? <p role="alert">{loadError} <button type="button" className={styles.retry} onClick={refresh}>Réessayer</button></p>
        : !schedule ? <p role="status">Chargement des créneaux…</p>
        : <>
          {schedule.upcoming.length > 0 && <div className={styles.upcoming}>
            <h2>Rendez-vous de ce véhicule</h2>
            <ul>{schedule.upcoming.map(slot => <li key={slot}>{describeSlot(slot)}</li>)}</ul>
          </div>}
          {schedule.available.length ? <form onSubmit={event => { event.preventDefault(); void book(); }}>
            <fieldset className={styles.slotPicker} disabled={saving}>
              <legend>Créneaux disponibles</legend>
              <div className={styles.slots}>{schedule.available.map(slot =>
                <label key={slot}>
                  <input type="radio" name="appointment-time" value={slot} checked={selected === slot}
                    onChange={() => { setSelected(slot); setNotice(""); }} />
                  <span>{slot.slice(11)}</span>
                </label>
              )}</div>
            </fieldset>
            <button className={styles.confirm} disabled={!selected || saving}>
              {saving ? "Réservation en cours…" : "Confirmer le rendez-vous"}
            </button>
          </form> : <p role="status">Aucun créneau disponible ce jour. Choisissez une autre date.</p>}
        </>}
    </section>
  );
}
