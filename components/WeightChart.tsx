import { displayWeight } from "@/lib/units";

export interface ChartPoint {
  date: string;
  weight_kg: number;
}

// Thin single-series line + area chart. Faint grid, dashed goal line,
// emphasized endpoint — see the dataviz mark spec this design followed.
export default function WeightChart({
  points,
  unit,
  goalKg,
}: {
  points: ChartPoint[];
  unit: "lbs" | "kg";
  goalKg?: number | null;
}) {
  if (points.length < 2) {
    return (
      <div className="chart-wrap">
        <div className="chart-head">
          <span className="card-title">Weight trend</span>
        </div>
        <p className="empty-state" style={{ padding: "24px 0" }}>
          Log a couple more weigh-ins to see your trend.
        </p>
      </div>
    );
  }

  const values = points.map((p) => displayWeight(p.weight_kg, unit));
  const goal = goalKg != null ? displayWeight(goalKg, unit) : null;
  const allValues = goal != null ? [...values, goal] : values;
  const max = Math.max(...allValues);
  const min = Math.min(...allValues);
  const pad = Math.max((max - min) * 0.15, 1);
  const top = max + pad;
  const bottom = min - pad;

  const chartW = 300;
  const chartL = 20;
  const chartR = 280;
  const chartTop = 14;
  const chartBottom = 100;

  const x = (i: number) => chartL + (i * (chartR - chartL)) / (points.length - 1);
  const y = (v: number) => chartTop + ((top - v) / (top - bottom)) * (chartBottom - chartTop);

  const coords = values.map((v, i) => [x(i), y(v)] as const);
  const linePath = coords.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${chartR},110 L${chartL},110 Z`;

  const delta = values[values.length - 1] - values[0];
  const trendingDown = delta <= 0;
  const [lastX, lastY] = coords[coords.length - 1];

  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="chart-wrap">
      <div className="chart-head">
        <span className="card-title">Weight trend</span>
        <span className="chart-delta" style={{ color: trendingDown ? "var(--good)" : "var(--warning)" }}>
          {delta > 0 ? "+" : ""}
          {delta.toFixed(1)} {unit}
        </span>
      </div>
      <svg viewBox="0 0 300 116" width="100%" height="120" role="img" aria-label="Weight trend chart">
        <line x1={chartL} y1={chartTop} x2={chartR} y2={chartTop} stroke="var(--line)" strokeWidth="1" />
        <line x1={chartL} y1={(chartTop + chartBottom) / 2} x2={chartR} y2={(chartTop + chartBottom) / 2} stroke="var(--line)" strokeWidth="1" />
        {goal != null && (
          <>
            <line
              x1={chartL}
              y1={y(goal)}
              x2={chartR}
              y2={y(goal)}
              stroke="var(--ink-400)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text x={chartR + 2} y={y(goal) + 3} fontSize="8" fill="var(--ink-400)" textAnchor="end">
              goal {goal}
            </text>
          </>
        )}
        <path d={areaPath} fill="var(--accent-soft)" opacity="0.6" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={lastX} cy={lastY} r="4.5" fill="var(--surface-1)" stroke="var(--accent)" strokeWidth="2.5" />
        <text x={chartL} y="112" fontSize="8" fill="var(--ink-400)">
          {fmt(points[0].date)}
        </text>
        <text x={chartR} y="112" fontSize="8" fill="var(--ink-400)" textAnchor="end">
          {fmt(points[points.length - 1].date)}
        </text>
      </svg>
    </div>
  );
}
