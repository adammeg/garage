"use client";

import { type ReactNode, useEffect, useRef } from "react";

const translations: Record<string, string> = {
  "GARAGE MANAGEMENT": "GESTION DU GARAGE", WORKSPACE: "ESPACE DE TRAVAIL", Overview: "Vue d’ensemble", Vehicles: "Véhicules", "Work log": "Journal des interventions", Mechanics: "Mécaniciens", "Need a hand?": "Besoin d’aide ?", "Visit the help center": "Consulter le centre d’aide", Workspace: "Espace de travail", Admin: "Administrateur", Mechanic: "Mécanicien", Notifications: "Notifications", "Good morning, Amine": "Bonjour, Amine", "Here's what's happening at the garage today.": "Voici l’activité du garage aujourd’hui.", "Find vehicles, review their records, and print service QR codes.": "Recherchez les véhicules, consultez leurs fiches et imprimez les codes QR.", "Every job completed and every note added to a vehicle.": "Toutes les interventions réalisées et les notes ajoutées aux véhicules.", "Manage the technicians working in your garage.": "Gérez les techniciens qui travaillent dans votre garage.", "Scan vehicle": "Scanner un véhicule", "New arrival": "Nouvelle arrivée", "Vehicles in garage": "Véhicules au garage", vehicles: "véhicules", "currently being serviced": "en cours de réparation", "Arrivals today": "Arrivées aujourd’hui", "from previous days": "des jours précédents", "Work completed today": "Interventions réalisées aujourd’hui", jobs: "interventions", "Across": "Réparties sur", mechanics: "mécaniciens", "Ready for pickup": "Prêts à récupérer", "Cleared by the mechanic": "Validés par le mécanicien", "Find a vehicle": "Rechercher un véhicule", "Search by registration, make, model, or owner": "Rechercher par immatriculation, marque, modèle ou propriétaire", "No matches. Add this vehicle as a new arrival.": "Aucun résultat. Ajoutez ce véhicule comme nouvelle arrivée.", "Quick actions": "Actions rapides", "Keep the day moving": "Gardez le rythme de la journée", "Log service": "Enregistrer une intervention", "Scan QR code": "Scanner un code QR", "Garage mechanics": "Mécaniciens du garage", "People with access to the workshop workspace.": "Personnes ayant accès à l’espace atelier.", "Create account": "Créer un compte", Active: "Actif", "Recent work": "Interventions récentes", "Service entries across all vehicles.": "Interventions enregistrées sur tous les véhicules.", VEHICLE: "VÉHICULE", SERVICE: "INTERVENTION", MECHANIC: "MÉCANICIEN", DATE: "DATE", MILEAGE: "KILOMÉTRAGE", "No additional notes": "Aucune note complémentaire", "Today's arrivals": "Arrivées du jour", "All vehicles": "Tous les véhicules", "Vehicles checked in at the garage today.": "Véhicules enregistrés au garage aujourd’hui.", "Select a vehicle to see its full service history and QR code.": "Sélectionnez un véhicule pour consulter son historique et son code QR.", "View all vehicles": "Voir tous les véhicules", OWNER: "PROPRIÉTAIRE", STATUS: "STATUT", "NEXT OIL CHANGE": "PROCHAINE VIDANGE", ARRIVED: "ARRIVÉ", Today: "Aujourd’hui", Earlier: "Antérieur", "No vehicles yet": "Aucun véhicule pour le moment", "Register an arrival to start a vehicle history.": "Enregistrez une arrivée pour créer l’historique d’un véhicule.", "Add vehicle": "Ajouter un véhicule", "Workshop dashboard": "Tableau de bord de l’atelier", "All records up to date": "Toutes les fiches sont à jour", "DIGITAL SERVICE RECORD": "FICHE D’ENTRETIEN NUMÉRIQUE", "VEHICLE LOOKUP": "RECHERCHE DE VÉHICULE", "Register an arrival": "Enregistrer une arrivée", "Log a service": "Enregistrer une intervention", "Create mechanic account": "Créer un compte mécanicien", "Scan or search vehicle": "Scanner ou rechercher un véhicule", Close: "Fermer", "Registration number": "Numéro d’immatriculation", "Owner name": "Nom du propriétaire", "Full name": "Nom complet", Make: "Marque", Model: "Modèle", Year: "Année", Phone: "Téléphone", "Current mileage (km)": "Kilométrage actuel (km)", "Next oil change (km)": "Prochaine vidange (km)", "A unique QR code will be available for this vehicle.": "Un code QR unique sera disponible pour ce véhicule.", Cancel: "Annuler", "Select registration": "Sélectionner une immatriculation", "Work completed": "Intervention réalisée", "Oil & filter change": "Vidange et changement du filtre", "Brake inspection": "Contrôle des freins", "Engine repair": "Réparation moteur", "Electrical repair": "Réparation électrique", "Tyre service": "Service pneus", "Air conditioning check": "Contrôle de climatisation", "Other maintenance": "Autre entretien", Notes: "Notes", "Parts changed, symptoms found, recommendations...": "Pièces changées, symptômes constatés, recommandations…", "Save service": "Enregistrer l’intervention", "Mechanics can log service and register arrivals, but cannot create accounts.": "Les mécaniciens peuvent enregistrer les interventions et les arrivées, mais pas créer de comptes.", "Email address": "Adresse e-mail", Specialty: "Spécialité", "Engine & servicing": "Moteur et entretien", "Technician name": "Nom du technicien", "Enter the registration shown on the vehicle QR label to open its service record.": "Saisissez l’immatriculation indiquée sur l’étiquette QR pour ouvrir sa fiche d’entretien.", Find: "Rechercher", "QR labels open the matching digital service record.": "Les étiquettes QR ouvrent la fiche d’entretien numérique correspondante.", "km remaining": "km restants", "Service history": "Historique des interventions", "Most recent first": "Du plus récent au plus ancien", "No maintenance records yet.": "Aucun entretien enregistré.", "Print QR & history": "Imprimer le QR et l’historique", "Add service": "Ajouter une intervention", "In service": "En réparation", Ready: "Prêt", Waiting: "En attente",
};

function translate(value: string) {
  return translations[value.trim()] ?? value;
}

export default function FrenchInterface({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const applyTranslations = () => {
      if (!root.current) return;
      const walker = document.createTreeWalker(root.current, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      nodes.forEach((node) => { node.nodeValue = translate(node.nodeValue || ""); });
      root.current.querySelectorAll<HTMLElement>("[title], [placeholder], [aria-label]").forEach((element) => {
        ["title", "placeholder", "aria-label"].forEach((attribute) => {
          const value = element.getAttribute(attribute);
          if (value) element.setAttribute(attribute, translate(value));
        });
      });
    };
    applyTranslations();
    const observer = new MutationObserver(applyTranslations);
    if (root.current) observer.observe(root.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <div ref={root}>{children}</div>;
}
