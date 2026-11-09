export const APPLICATION_STATUSES = [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];

/** Statuses that still need attention. */
export const ACTIVE_STATUSES: readonly ApplicationStatusValue[] = [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
];

/** Statuses that count as a response from the employer. */
export const RESPONDED_STATUSES: readonly ApplicationStatusValue[] = [
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

export const CLOSED_STATUSES: readonly ApplicationStatusValue[] = [
  "REJECTED",
  "WITHDRAWN",
];

export const BOARD_COLUMNS = [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "CLOSED",
] as const;

export type BoardColumn = (typeof BOARD_COLUMNS)[number];

export const STATUS_LABELS: Record<ApplicationStatusValue, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const STATUS_DESCRIPTIONS: Record<ApplicationStatusValue, string> = {
  SAVED: "Shortlisted, not sent yet",
  APPLIED: "Application submitted",
  SCREENING: "Recruiter or hiring-manager screen",
  INTERVIEW: "Interview process underway",
  OFFER: "Offer received",
  REJECTED: "Closed by the employer",
  WITHDRAWN: "Closed by you",
};

export const STATUS_VARIANTS: Record<
  ApplicationStatusValue,
  "default" | "secondary" | "outline" | "success" | "warning" | "destructive"
> = {
  SAVED: "secondary",
  APPLIED: "default",
  SCREENING: "warning",
  INTERVIEW: "default",
  OFFER: "success",
  REJECTED: "destructive",
  WITHDRAWN: "outline",
};

export const BOARD_COLUMN_LABELS: Record<BoardColumn, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  CLOSED: "Closed",
};

export function isActiveStatus(status: string) {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

export function isClosedStatus(status: string) {
  return (CLOSED_STATUSES as readonly string[]).includes(status);
}

export function toBoardColumn(status: string): BoardColumn {
  if (status === "REJECTED" || status === "WITHDRAWN") return "CLOSED";
  if ((BOARD_COLUMNS as readonly string[]).includes(status)) {
    return status as BoardColumn;
  }
  return "SAVED";
}
