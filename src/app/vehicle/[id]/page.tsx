import { Suspense } from "react";
import VehicleHistoryClient from "./vehicle-history-client";

export default function VehicleHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main>Loading service record...</main>}>
      <VehicleHistoryClient params={params} />
    </Suspense>
  );
}
