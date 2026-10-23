"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Bell, BriefcaseBusiness, CalendarDays, CarFront, Check, ChevronDown, CircleHelp, Clock3, Download, FilePlus2, Gauge, KeyRound, LogOut, Pencil, Plus, QrCode, Search, ShieldCheck, Trash2, UsersRound, Wrench, X } from "lucide-react";
import styles from "./page.module.css";
import FrenchInterface from "./french-interface";

type Job = { id: string; date: string; kind: string; mileage: number; notes: string; mechanic: string };
type Vehicle = { id: string; plate: string; make: string; model: string; year: number; owner: string; phone: string; mileage: number; nextOil: number; status: "In service" | "Ready" | "Waiting"; arrived: string; history: Job[] };
type Mechanic = { name: string; email: string; specialty: string };
type AuthUser = { id: string; name: string; email: string; role: "admin" | "mechanic"; specialty?: string };
type Modal = "vehicle" | "edit" | "service" | "mechanic" | "qr" | "scan" | null;
let activeDay = "";
const today = () => activeDay;
const fmt = (value: number) => new Intl.NumberFormat("fr-FR").format(value);

export default function Home() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [role, setRole] = useState<"Admin" | "Mechanic">("Admin");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [section, setSection] = useState("Overview");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [notice, setNotice] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [currentDay, setCurrentDay] = useState("");
  const [dateLabel, setDateLabel] = useState("Aujourd’hui");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const now = new Date();
      activeDay = now.toISOString().slice(0, 10);
      setCurrentDay(activeDay);
      setDateLabel(now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    fetch("/api/auth/me").then(async (response) => {
      if (!response.ok) { router.replace("/connexion"); return; }
      const data = await response.json() as { user: AuthUser };
      setAuthUser(data.user);
      setRole(data.user.role === "admin" ? "Admin" : "Mechanic");
    }).catch(() => router.replace("/connexion"));
  }, [router]);
  useEffect(() => {
    if (authUser) document.title = `${authUser.name} · Atelier`;
  }, [authUser]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetch("/api/vehicles", { signal: controller.signal }), fetch("/api/mechanics", { signal: controller.signal })])
      .then(async ([vehiclesResponse, mechanicsResponse]) => {
        if (!vehiclesResponse.ok || !mechanicsResponse.ok) throw new Error("Unable to load garage data.");
        const [vehicleData, mechanicData] = await Promise.all([vehiclesResponse.json(), mechanicsResponse.json()]) as [{ vehicles: Vehicle[] }, { mechanics: Mechanic[] }];
        setVehicles(vehicleData.vehicles);
        setMechanics(mechanicData.mechanics);
      })
      .catch(() => setNotice("Impossible de se connecter à la base de données du garage."));
    return () => controller.abort();
  }, []);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 3200); return () => window.clearTimeout(timer); }, [notice]);

  const arrivals = vehicles.filter((car) => car.arrived === currentDay);
  const jobsToday = vehicles.flatMap((car) => car.history).filter((job) => job.date === currentDay);
  const matching = useMemo(() => vehicles.filter((car) => `${car.plate} ${car.make} ${car.model} ${car.owner}`.toLowerCase().includes(search.toLowerCase())), [vehicles, search]);
  const showVehicle = (car: Vehicle) => { setSelected(car); setModal("qr"); };
  async function addVehicle(form: FormData) {
    const response = await fetch("/api/vehicles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const data = await response.json();
    if (!response.ok) { setNotice(data.error || "Impossible d’ajouter le véhicule."); return; }
    setVehicles((current) => [data.vehicle as Vehicle, ...current]); setModal(null); setNotice(`${data.vehicle.plate} ajouté aux arrivées du jour`);
  }
  async function updateVehicle(form: FormData) {
    if (!selected) return;
    const response = await fetch(`/api/vehicles/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(form), action: "update" }) });
    const data = await response.json();
    if (!response.ok) { setNotice(data.error || "Impossible de modifier le vehicule."); return; }
    const updated = data.vehicle as Vehicle;
    setVehicles((current) => current.map((car) => car.id === updated.id ? updated : car));
    setSelected(updated);
    setModal("qr");
    setNotice(`${updated.plate} a ete modifie.`);
  }
  async function deleteVehicle() {
    if (!selected || !window.confirm(`Supprimer definitivement le vehicule ${selected.plate} et son historique ?`)) return;
    const response = await fetch(`/api/vehicles/${selected.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setNotice(data.error || "Impossible de supprimer le vehicule.");
      return;
    }
    setVehicles((current) => current.filter((car) => car.id !== selected.id));
    setSelected(null);
    setModal(null);
    setNotice(`${selected.plate} a ete supprime.`);
  }
  async function addJob(form: FormData) {
    if (!selected) return;
    const values = Object.fromEntries(form);
    const response = await fetch(`/api/vehicles/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, mechanic: values.mechanic, ready: values.ready === "on" }) });
    const data = await response.json();
    if (!response.ok) { setNotice(data.error || "Impossible d’enregistrer l’intervention."); return; }
    const updated = data.vehicle as Vehicle;
    setVehicles((current) => current.map((car) => car.id === selected.id ? updated : car)); setSelected(updated); setModal(null); setNotice(`Intervention enregistrée pour ${selected.plate}`);
  }
  async function addMechanic(form: FormData) {
    const password = window.prompt("Mot de passe temporaire du mécanicien (8 caractères minimum) :");
    if (!password || password.length < 8) { setNotice("Le mot de passe temporaire doit contenir au moins 8 caractères."); return; }
    const response = await fetch("/api/mechanics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(form), password }) });
    const data = await response.json();
    if (!response.ok) { setNotice(data.error || "Impossible de créer le compte mécanicien."); return; }
    setMechanics((current) => [...current, data.mechanic as Mechanic]); setModal(null); setNotice(`Compte créé pour ${data.mechanic.name}`);
  }
  function findVehicle(value: string) {
    const normalized = value.replace(/\s/g, "").toLowerCase();
    const car = vehicles.find((item) => item.plate.replace(/\s/g, "").toLowerCase() === normalized || item.id.toLowerCase() === normalized);
    if (car) { setSelected(car); setModal("qr"); setSearch(""); setScanValue(""); } else setNotice("Aucun véhicule trouvé. Vérifiez l’immatriculation ou ajoutez une nouvelle arrivée.");
  }
  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/connexion");
  }, [router]);
  const menu = [{ label: "Overview", icon: Gauge }, { label: "Vehicles", icon: CarFront }, { label: "Work log", icon: BriefcaseBusiness }, ...(role === "Admin" ? [{ label: "Mechanics", icon: UsersRound }] : [])];

  return <FrenchInterface><div className={styles.shell}>
    <aside className={styles.sidebar}>
      <a className={styles.brand} href="#overview" onClick={() => setSection("Overview")}><span className={styles.brandMark}><Wrench size={19} /></span><span>ATELIER<span className={styles.brandSub}>GARAGE MANAGEMENT</span></span></a>
      <div className={styles.branch}><span className={styles.branchDot} /> TUNIS  <ChevronDown size={14} /></div><span className={styles.navCaption}>WORKSPACE</span>
      <nav className={styles.nav} aria-label="Main navigation">{menu.map(({ label, icon: Icon }) => <button key={label} className={`${styles.navItem} ${section === label ? styles.navActive : ""}`} onClick={() => setSection(label)}><Icon size={18} /><span>{label}</span>{label === "Work log" && jobsToday.length > 0 && <span className={styles.navCount}>{jobsToday.length}</span>}</button>)}</nav>
      <div className={styles.sideBottom}><div className={styles.sideHelp}><CircleHelp size={17} /><span>Need a hand?<small>Visit the help center</small></span><ArrowRight size={15} /></div><div className={styles.userCard}><span className={styles.avatar}>{authUser?.name.split(" ").map((part) => part[0]).join("").slice(0, 2) || "AG"}</span><span className={styles.userInfo}><b>{authUser?.name || "Atelier Garage"}</b><small>{authUser?.role === "admin" ? "Administrateur" : "Mécanicien"} · Atelier Garage</small></span><button className={styles.iconButton} title="Se déconnecter" onClick={() => void logout()}><LogOut size={16} /></button></div></div>
    </aside>
    <main className={styles.main}>
      <header className={styles.topbar}><div className={styles.mobileBrand}><span className={styles.brandMark}><Wrench size={18} /></span> ATELIER</div><div className={styles.breadcrumb}>Workspace <span>/</span> <b>{section}</b></div><div className={styles.topActions}><label className={styles.roleSelect}><ShieldCheck size={15} /><select value={role} onChange={(event) => { setRole(event.target.value as "Admin" | "Mechanic"); if (event.target.value === "Mechanic" && section === "Mechanics") setSection("Overview"); }} aria-label="Current role"><option>Admin</option><option>Mechanic</option></select><ChevronDown size={13} /></label><button className={styles.iconButton} title="Notifications"><Bell size={18} /><i /></button><span className={styles.topAvatar}>{role === "Admin" ? "AB" : "SK"}</span></div></header>
      <div className={styles.content}>
        <div className={styles.pageHeading}><div><div className={styles.eyebrow}><CalendarDays size={14} /> {dateLabel}</div><h1>{section === "Overview" ? "Good morning" : section}<span className={styles.headingDot}>.</span></h1><p>{section === "Overview" ? "Here's what's happening at the garage today." : section === "Vehicles" ? "Find vehicles, review their records, and print service QR codes." : section === "Work log" ? "Every job completed and every note added to a vehicle." : "Manage the technicians working in your garage."}</p></div><div className={styles.headingActions}><button className={styles.secondaryButton} onClick={() => setModal("scan")}><QrCode size={16} /> Scan vehicle</button><button className={styles.primaryButton} onClick={() => setModal("vehicle")}><Plus size={17} /> New arrival</button></div></div>
        <section className={styles.metrics}>
          <article className={styles.metric}><div className={styles.metricTop}><span>Vehicles in garage</span><span className={`${styles.metricIcon} ${styles.metricTeal}`}><CarFront size={17} /></span></div><div className={styles.metricValue}>{vehicles.length}<small>vehicles</small></div><div className={styles.metricFoot}><i className={styles.footDotTeal} /> {vehicles.filter((car) => car.status === "In service").length} currently being serviced</div></article>
          <article className={styles.metric}><div className={styles.metricTop}><span>Arrivals today</span><span className={`${styles.metricIcon} ${styles.metricBlue}`}><ArrowRight size={17} /></span></div><div className={styles.metricValue}>{arrivals.length}<small>vehicles</small></div><div className={styles.metricFoot}><i className={styles.footDotBlue} /> {vehicles.length - arrivals.length} from previous days</div></article>
          <article className={styles.metric}><div className={styles.metricTop}><span>Work completed today</span><span className={`${styles.metricIcon} ${styles.metricYellow}`}><Wrench size={16} /></span></div><div className={styles.metricValue}>{jobsToday.length}<small>jobs</small></div><div className={styles.metricFoot}><i className={styles.footDotYellow} /> Across {new Set(jobsToday.map((job) => job.mechanic)).size} mechanics</div></article>
          <article className={styles.metric}><div className={styles.metricTop}><span>Ready for pickup</span><span className={`${styles.metricIcon} ${styles.metricGreen}`}><Check size={17} /></span></div><div className={styles.metricValue}>{vehicles.filter((car) => car.status === "Ready").length}<small>vehicles</small></div><div className={styles.metricFoot}><i className={styles.footDotGreen} /> Cleared by the mechanic</div></article>
        </section>
        <section className={styles.quickRow}>
          <div className={styles.searchPanel}><div className={styles.quickTitle}><span className={styles.quickIcon}><Search size={17} /></span><span><b>Find a vehicle</b><small>Search by registration, make, model, or owner</small></span></div><div className={styles.searchBox}><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try 205 TN 1234" aria-label="Search vehicles" /><kbd>⌘ K</kbd></div>{search && <div className={styles.searchResults}>{matching.slice(0, 5).map((car) => <button key={car.id} onClick={() => { setSearch(""); showVehicle(car); }}><span className={styles.carThumb}><CarFront size={17} /></span><span><b>{car.plate}</b><small>{car.make} {car.model} · {car.owner}</small></span><ArrowRight size={15} /></button>)}{matching.length === 0 && <p>No matches. Add this vehicle as a new arrival.</p>}</div>}</div>
          <div className={styles.actionPanel}><div className={styles.quickTitle}><span className={`${styles.quickIcon} ${styles.quickOrange}`}><Activity size={17} /></span><span><b>Quick actions</b><small>Keep the day moving</small></span></div><div className={styles.actionButtons}><button onClick={() => setModal("service")}><span className={styles.actionCircle}><FilePlus2 size={17} /></span><span>Log service</span><ArrowRight size={14} /></button><button onClick={() => setModal("scan")}><span className={styles.actionCircle}><QrCode size={17} /></span><span>Scan QR code</span><ArrowRight size={14} /></button></div></div>
        </section>
        {section === "Mechanics" ? <section className={styles.tablePanel}><div className={styles.tableHeading}><div><h2>Garage mechanics <span>{mechanics.length}</span></h2><p>People with access to the workshop workspace.</p></div><button className={styles.primaryButton} onClick={() => setModal("mechanic")}><Plus size={16} /> Create account</button></div><div className={styles.mechanicsGrid}>{mechanics.map((person) => <article className={styles.mechanicCard} key={person.email}><span className={styles.mechanicAvatar}>{person.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><b>{person.name}</b><small>{person.email}</small><span>{person.specialty}</span></div><span className={styles.activeTag}><i /> Active</span></article>)}</div></section> : section === "Work log" ? <section className={styles.tablePanel}><div className={styles.tableHeading}><div><h2>Recent work</h2><p>Service entries across all vehicles.</p></div><button className={styles.secondaryButton} onClick={() => setModal("service")}><Plus size={16} /> Log service</button></div><div className={styles.tableWrap}><table><thead><tr><th>VEHICLE</th><th>SERVICE</th><th>MECHANIC</th><th>DATE</th><th>MILEAGE</th></tr></thead><tbody>{vehicles.flatMap((car) => car.history.map((job) => ({ ...job, car }))).sort((a, b) => b.date.localeCompare(a.date)).map((item) => <tr key={item.id}><td><button className={styles.plateLink} onClick={() => showVehicle(item.car)}>{item.car.plate}</button><small>{item.car.make} {item.car.model}</small></td><td><b>{item.kind}</b><small>{item.notes || "No additional notes"}</small></td><td>{item.mechanic}</td><td>{item.date}</td><td>{fmt(item.mileage)} km</td></tr>)}</tbody></table></div></section> : <section className={styles.tablePanel}><div className={styles.tableHeading}><div><h2>{section === "Overview" ? "Today's arrivals" : "All vehicles"}<span>{section === "Overview" ? arrivals.length : vehicles.length}</span></h2><p>{section === "Overview" ? "Vehicles checked in at the garage today." : "Select a vehicle to see its full service history and QR code."}</p></div><button className={styles.textButton} onClick={() => setSection("Vehicles")}>View all vehicles <ArrowRight size={15} /></button></div><div className={styles.tableWrap}><table><thead><tr><th>VEHICLE</th><th>OWNER</th><th>STATUS</th><th>MILEAGE</th><th>NEXT OIL CHANGE</th><th>ARRIVED</th><th /></tr></thead><tbody>{(section === "Overview" ? [...arrivals, ...vehicles.filter((car) => car.arrived !== today()).slice(0, Math.max(0, 4 - arrivals.length))] : matching).map((car) => <tr key={car.id} onClick={() => showVehicle(car)} className={styles.clickRow}><td><div className={styles.carCell}><span className={styles.carThumb}><CarFront size={18} /></span><span><b>{car.plate}</b><small>{car.make} {car.model} · {car.year}</small></span></div></td><td><b className={styles.ownerName}>{car.owner}</b><small>{car.phone}</small></td><td><span className={`${styles.status} ${car.status === "Ready" ? styles.statusReady : car.status === "Waiting" ? styles.statusWaiting : styles.statusService}`}><i />{car.status}</span></td><td>{fmt(car.mileage)} km</td><td><span className={car.nextOil - car.mileage <= 1000 ? styles.dueSoon : ""}>{fmt(car.nextOil)} km</span><small>{fmt(Math.max(0, car.nextOil - car.mileage))} km remaining</small></td><td>{car.arrived === today() ? <span className={styles.arrivalTime}><Clock3 size={13} /> Today</span> : <span className={styles.mutedText}>Earlier</span>}</td><td><button className={styles.rowQr} title="View QR and history" onClick={(event) => { event.stopPropagation(); showVehicle(car); }}><QrCode size={17} /></button></td></tr>)}</tbody></table>{vehicles.length === 0 && <div className={styles.emptyState}><CarFront size={26} /><b>No vehicles yet</b><span>Register an arrival to start a vehicle history.</span><button className={styles.secondaryButton} onClick={() => setModal("vehicle")}><Plus size={15} /> Add vehicle</button></div>}</div></section>}
        <footer className={styles.footer}><span>ATELIER GARAGE <i /> Workshop dashboard</span><span><i className={styles.onlineDot} /> All records up to date</span></footer>
      </div>
    </main>
    <nav className={styles.mobileNav} aria-label="Navigation mobile">{menu.map(({ label, icon: Icon }) => <button key={label} className={section === label ? styles.mobileNavActive : ""} onClick={() => setSection(label)}><Icon size={19} /><span>{label}</span></button>)}</nav>
    {modal && <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section className={`${styles.dialog} ${modal === "qr" ? styles.qrDialog : ""}`} role="dialog" aria-modal="true"><div className={styles.dialogHead}><div><span className={styles.dialogEyebrow}>{modal === "qr" ? "DIGITAL SERVICE RECORD" : modal === "scan" ? "VEHICLE LOOKUP" : "ATELIER GARAGE"}</span><h2>{modal === "vehicle" ? "Register an arrival" : modal === "service" ? "Log a service" : modal === "mechanic" ? "Create mechanic account" : modal === "scan" ? "Scan or search vehicle" : `${selected?.plate ?? "Vehicle"} · ${selected?.make} ${selected?.model}`}</h2></div><button className={styles.iconButton} onClick={() => setModal(null)} aria-label="Close"><X size={18} /></button></div>
      {modal === "vehicle" && <form className={styles.form} action={addVehicle}><div className={styles.formGrid}><label>Registration number<input name="plate" required placeholder="205 TN 1234" /></label><label>Owner name<input name="owner" required placeholder="Full name" /></label><label>Make<input name="make" required placeholder="Peugeot" /></label><label>Model<input name="model" required placeholder="208" /></label><label>Year<input name="year" type="number" min="1950" max="2035" required defaultValue="2022" /></label><label>Phone<input name="phone" placeholder="+216 ..." /></label><label>Current mileage (km)<input name="mileage" type="number" min="0" required placeholder="68420" /></label><label>Next oil change (km)<input name="nextOil" type="number" min="0" required placeholder="74000" /></label></div><div className={styles.formNote}><QrCode size={16} /> A unique QR code will be available for this vehicle.</div><div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={() => setModal(null)}>Cancel</button><button className={styles.primaryButton}><Plus size={16} /> Add vehicle</button></div></form>}
      {modal === "edit" && selected && <form className={styles.form} action={updateVehicle}><div className={styles.formGrid}><label>Immatriculation<input name="plate" required defaultValue={selected.plate} /></label><label>Nom du proprietaire<input name="owner" required defaultValue={selected.owner} /></label><label>Marque<input name="make" required defaultValue={selected.make} /></label><label>Modele<input name="model" required defaultValue={selected.model} /></label><label>Annee<input name="year" type="number" min="1950" max="2035" required defaultValue={selected.year} /></label><label>Telephone<input name="phone" defaultValue={selected.phone} /></label><label>Kilometrage actuel (km)<input name="mileage" type="number" min="0" required defaultValue={selected.mileage} /></label><label>Prochaine vidange (km)<input name="nextOil" type="number" min="0" required defaultValue={selected.nextOil} /></label><label>Statut<select name="status" defaultValue={selected.status}><option value="Waiting">En attente</option><option value="In service">En reparation</option><option value="Ready">Pret</option></select></label></div><div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={() => setModal("qr")}>Annuler</button><button className={styles.primaryButton}><Check size={16} /> Enregistrer les modifications</button></div></form>}
      {modal === "service" && <form className={styles.form} action={addJob}><label>Vehicle<select required value={selected?.id ?? ""} onChange={(event) => setSelected(vehicles.find((car) => car.id === event.target.value) ?? null)}><option value="" disabled>Select registration</option>{vehicles.map((car) => <option key={car.id} value={car.id}>{car.plate} · {car.make} {car.model}</option>)}</select></label><label>Work completed<select name="kind" required defaultValue="Oil & filter change"><option>Oil & filter change</option><option>Brake inspection</option><option>Engine repair</option><option>Electrical repair</option><option>Tyre service</option><option>Air conditioning check</option><option>Other maintenance</option></select></label><div className={styles.formGrid}><label>Current mileage (km)<input name="mileage" type="number" min="0" required defaultValue={selected?.mileage ?? ""} /></label><label>Mechanic<select name="mechanic">{mechanics.map((person) => <option key={person.email}>{person.name}</option>)}</select></label></div><label>Notes<textarea name="notes" rows={3} placeholder="Parts changed, symptoms found, recommendations..." /></label><div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={() => setModal(null)}>Cancel</button><button className={styles.primaryButton} type="submit" disabled={!selected}><Check size={16} /> Save service</button></div></form>}
      {modal === "mechanic" && role === "Admin" && <form className={styles.form} action={addMechanic}><div className={styles.formNote}><KeyRound size={16} /> Mechanics can log service and register arrivals, but cannot create accounts.</div><label>Full name<input name="name" required placeholder="Technician name" /></label><label>Email address<input name="email" type="email" required placeholder="name@garage.tn" /></label><label>Specialty<input name="specialty" required placeholder="Engine & servicing" /></label><div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={() => setModal(null)}>Cancel</button><button className={styles.primaryButton}><UsersRound size={16} /> Create account</button></div></form>}
      {modal === "scan" && <div className={styles.scanContent}><div className={styles.scanSymbol}><QrCode size={31} /></div><p>Enter the registration shown on the vehicle QR label to open its service record.</p><form className={styles.scanForm} onSubmit={(event) => { event.preventDefault(); findVehicle(scanValue); }}><input autoFocus value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder="205 TN 1234" aria-label="Vehicle registration" /><button className={styles.primaryButton}><Search size={16} /> Find</button></form><span className={styles.scanHint}>QR labels open the matching digital service record.</span></div>}
      {modal === "qr" && selected && <div className={styles.vehicleRecord}><div className={styles.recordTop}><div className={styles.recordCar}><span className={styles.recordCarIcon}><CarFront size={24} /></span><div><strong>{selected.make} {selected.model}</strong><span>{selected.year} · {selected.owner}</span><small>{selected.phone}</small></div></div><span className={`${styles.status} ${selected.status === "Ready" ? styles.statusReady : selected.status === "Waiting" ? styles.statusWaiting : styles.statusService}`}><i />{selected.status}</span></div><div className={styles.qrAndOil}><div className={styles.qrPrint}><QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/vehicle/${selected.id}`} size={148} level="M" includeMargin /></div><div className={styles.nextOil}><span>NEXT OIL CHANGE</span><strong>{fmt(selected.nextOil)} <small>km</small></strong><div className={styles.progressTrack}><span style={{ width: `${Math.min(100, Math.max(0, selected.mileage / selected.nextOil * 100))}%` }} /></div><small>{fmt(Math.max(0, selected.nextOil - selected.mileage))} km remaining</small><button className={styles.secondaryButton} onClick={() => setModal("service")}><Plus size={14} /> Log a service</button></div></div><div className={styles.historyHead}><h3>Service history <span>{selected.history.length}</span></h3><span>Most recent first</span></div><div className={styles.historyList}>{selected.history.length ? selected.history.map((job) => <article className={styles.historyEntry} key={job.id}><span className={styles.historyLine}><i /></span><div><div className={styles.historyMeta}><b>{job.kind}</b><time>{job.date}</time></div><p>{job.notes || "Service completed."}</p><span>{job.mechanic} <i /> {fmt(job.mileage)} km</span></div></article>) : <div className={styles.historyEmpty}>No maintenance records yet.</div>}</div><div className={styles.dialogActions}><button className={styles.secondaryButton} onClick={() => window.print()}><Download size={15} /> Imprimer le QR</button><button className={styles.secondaryButton} onClick={() => setModal("edit")}><Pencil size={15} /> Modifier le vehicule</button><button className={styles.dangerButton} onClick={() => void deleteVehicle()}><Trash2 size={15} /> Supprimer</button><button className={styles.primaryButton} onClick={() => setModal("service")}><Plus size={15} /> Ajouter une intervention</button></div></div>}
    </section></div>}
    {notice && <div className={styles.toast}><Check size={16} /> {notice}</div>}
  </div></FrenchInterface>;
}
