const STYLES: Record<string, string> = {
  UP: "bg-up/10 text-up ring-1 ring-inset ring-up/30",
  DOWN: "bg-down/10 text-down ring-1 ring-inset ring-down/30",
  PENDING: "bg-pending/10 text-pending ring-1 ring-inset ring-pending/30",
  PAUSED: "bg-paused/10 text-paused ring-1 ring-inset ring-paused/30",
};

const LABELS: Record<string, string> = {
  UP: "Up",
  DOWN: "Down",
  PENDING: "Pending",
  PAUSED: "Paused",
};

export function StatusBadge({ status, active = true }: { status: string; active?: boolean }) {
  const key = active ? status : "PAUSED";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[key] ?? STYLES.PENDING}`}>
      {LABELS[key] ?? key}
    </span>
  );
}
