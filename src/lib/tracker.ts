import {
  ACTIVE_STATUSES,
  RESPONDED_STATUSES,
  toBoardColumn,
  type BoardColumn,
} from "@/lib/applications/status";

export type TrackerApplication = {
  id: string;
  status: string;
  createdAt: Date | string;
  appliedAt?: Date | string | null;
  job: {
    company: string;
    title: string;
    location?: string | null;
  };
  analysis: { overallScore: number } | null;
};

export type TrackerMetrics = {
  total: number;
  active: number;
  submitted: number;
  responded: number;
  interviews: number;
  offers: number;
  closed: number;
  responseRate: number | null;
  averageScore: number | null;
};

export type TimelineEvent = {
  id: string;
  type: string;
  note: string | null;
  createdAt: Date | string;
};

export type TimelineDay<T extends TimelineEvent = TimelineEvent> = {
  /** UTC date key, YYYY-MM-DD. */
  date: string;
  events: T[];
};

/**
 * Splits applications into board columns. Closed applications are grouped into
 * a single column so the pipeline stays readable.
 */
export function groupApplicationsByStatus<T extends TrackerApplication>(
  applications: T[],
): Record<BoardColumn, T[]> {
  const groups: Record<BoardColumn, T[]> = {
    SAVED: [],
    APPLIED: [],
    SCREENING: [],
    INTERVIEW: [],
    OFFER: [],
    CLOSED: [],
  };

  for (const application of applications) {
    groups[toBoardColumn(application.status)].push(application);
  }

  return groups;
}

export function computeTrackerMetrics(
  applications: TrackerApplication[],
): TrackerMetrics {
  const submitted = applications.filter(
    (application) =>
      application.appliedAt != null || application.status !== "SAVED",
  );
  const responded = applications.filter((application) =>
    (RESPONDED_STATUSES as readonly string[]).includes(application.status),
  );
  const scored = applications.filter(
    (application): application is TrackerApplication & {
      analysis: { overallScore: number };
    } => application.analysis !== null,
  );

  return {
    total: applications.length,
    active: applications.filter((application) =>
      (ACTIVE_STATUSES as readonly string[]).includes(application.status),
    ).length,
    submitted: submitted.length,
    responded: responded.length,
    interviews: applications.filter(
      (application) => application.status === "INTERVIEW",
    ).length,
    offers: applications.filter(
      (application) => application.status === "OFFER",
    ).length,
    closed: applications.filter(
      (application) =>
        application.status === "REJECTED" ||
        application.status === "WITHDRAWN",
    ).length,
    responseRate:
      submitted.length === 0
        ? null
        : Math.round((responded.length / submitted.length) * 100),
    averageScore:
      scored.length === 0
        ? null
        : Math.round(
            scored.reduce(
              (total, application) =>
                total + application.analysis.overallScore,
              0,
            ) / scored.length,
          ),
  };
}

/** Groups already-sorted events into UTC days, newest first. */
export function groupEventsByDay<T extends TimelineEvent>(
  events: T[],
): TimelineDay<T>[] {
  const days = new Map<string, T[]>();

  for (const event of events) {
    const date = toDateKey(event.createdAt);
    const bucket = days.get(date);
    if (bucket) {
      bucket.push(event);
    } else {
      days.set(date, [event]);
    }
  }

  return [...days.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, items]) => ({ date, events: items }));
}

export function toDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

const EVENT_LABELS: Record<string, string> = {
  ANALYSIS_COMPLETED: "Analysis ready",
  STATUS_CHANGED: "Status changed",
  MATERIAL_GENERATED: "Material generated",
  NOTE_ADDED: "Note added",
};

export function eventLabel(type: string) {
  if (EVENT_LABELS[type]) return EVENT_LABELS[type];

  return type
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
