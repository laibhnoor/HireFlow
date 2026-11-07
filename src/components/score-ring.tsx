import { cn } from "@/lib/utils";

export function ScoreRing({
  score,
  size = 168,
  strokeWidth = 12,
  className,
  label,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? "Match score"}: ${clamped} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="oklch(0.68 0.17 320)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#score-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span
          className="font-semibold tabular-nums leading-none"
          style={{ fontSize: size * 0.27 }}
        >
          {clamped}
        </span>
        <span
          className="mt-1 font-medium uppercase tracking-[0.16em] text-muted-foreground"
          style={{ fontSize: Math.max(9, size * 0.068) }}
        >
          {label ?? "Match"}
        </span>
      </div>
    </div>
  );
}
