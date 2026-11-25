"use client";

import { useEffect, useState } from "react";
import VehicleStatusDot from "../../vehicle-status-dot";
import type { VehicleStatus } from "@/lib/vehicle-status";
import { CalendarDays } from "lucide-react";
import { isBookingDate, isGarageClosed, MAX_APPOINTMENT_REASON_LENGTH } from "@/lib/appointment-times";
import styles from "./vehicle.module.css";

type Schedule = { available: string[]; upcoming: string[]; reasons: Record<string, string | null> };

const frenchDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long", timeZone: "UTC",
});

function describeSlot(slot: string) {
  return frenchDate.format(new Date(slot.slice(0, 10) + "T00:00:00Z")) + " à " + slot.slice(11);
}

type BookingProps = { vehicle?: { id: string; plate: string; status: VehicleStatus }; today: string };

export default function AppointmentBooking({ vehicle, today }: BookingProps) {
  const [date, setDate] = useState(today);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [selected, setSelected] = useState("");
  const [plate, setPlate] = useState("");
  const [reason, setReason] = useState("");
  const [revision, setRevision] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const endpoint = vehicle ? `/api/vehicles/${vehicle.id}/appointments` : "/api/appointments";
  const canBook = Boolean(selected && reason.trim() && (vehicle || plate.trim())) && !saving;
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
    if (!canBook) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: selected, reason: reason.trim(), plate: vehicle ? undefined : plate.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        setReason("");
        setNotice(`Rendez-vous confirmé pour ${vehicle?.plate ?? plate.trim().toUpperCase()} le ${describeSlot(data.slot)}.`);
        refresh();
      } else {
        setNotice(data.error || "Impossible de confirmer le rendez-vous.");
        if (response.status === 409) refresh();
      }
    } catch {
      setNotice(vehicle ? "Confirmation indisponible. Vérifiez vos rendez-vous avant de réessayer." : "Confirmation indisponible. Réessayez avec la même immatriculation et le même créneau ou contactez le garage.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.booking} aria-labelledby="booking-title">
      <h1 id="booking-title"><CalendarDays size={22} aria-hidden="true" /> Prendre rendez-vous</h1>
      {vehicle && <p>Immatriculation · <strong><VehicleStatusDot status={vehicle.status} />{vehicle.plate}</strong></p>}
      <p>Du lundi au samedi, de 9 h à 17 h · 30 minutes · Heure de Tunis</p>
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
            <ul>{schedule.upcoming.map(slot => <li key={slot}>
              {describeSlot(slot)}
              {schedule.reasons[slot] && <span className={styles.savedReason}>{schedule.reasons[slot]}</span>}
            </li>)}</ul>
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
            {!vehicle && <label className={styles.reasonField}>
              Immatriculation du véhicule (obligatoire)
              <input name="plate" required maxLength={80} disabled={saving} autoCapitalize="characters"
                value={plate} onChange={event => setPlate(event.target.value)} placeholder="Ex. 123 TU 4567" />
            </label>}
            <label className={styles.reasonField}>
              Motif du rendez-vous (obligatoire)
              <textarea required rows={3} maxLength={MAX_APPOINTMENT_REASON_LENGTH} disabled={saving}
                value={reason} onChange={event => setReason(event.target.value)}
                placeholder="Ex. : vidange, bruit au freinage…" />
            </label>
            <button className={styles.confirm} disabled={!canBook}>
              {saving ? "Réservation en cours…" : "Confirmer le rendez-vous"}
            </button>
          </form> : <p role="status">{isGarageClosed(date)
            ? "Le garage est fermé le dimanche. Choisissez une autre date."
            : "Aucun créneau disponible ce jour. Choisissez une autre date."}</p>}
        </>}
    </section>
  );
}
