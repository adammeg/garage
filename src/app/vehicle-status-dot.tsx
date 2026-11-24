import { statusLabels, type VehicleStatus } from "@/lib/vehicle-status";
import styles from "./vehicle-status-dot.module.css";

export default function VehicleStatusDot({ status }: { status: VehicleStatus }) {
  const label = statusLabels[status];
  return <i className={`${styles.dot} ${styles[status]}`} role="img" aria-label={label} title={label} />;
}
