import { explanations } from "@/lib/scientific-copy";
import type { ReactNode } from "react";
import {
  FlaskConical,
  LoaderCircle,
  Play,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "./ui/button";
import { InfoTooltip } from "./ui/tooltip";
export function DemoDataBadge() {
  return <span className="demo-badge">Demo Data</span>;
}
export function StatusBadge() {
  return (
    <span className="status-badge">
      <FlaskConical size={13} />
      Simulation Mode
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="header-action">{action}</div>}
    </header>
  );
}
export function MetricCard({
  label,
  value,
  detail,
  symbol,
  demo = true,
  liveLabel = "API response",
  precision = 2,
}: {
  label: string;
  value: number;
  detail?: string;
  symbol?: string;
  demo?: boolean;
  liveLabel?: string;
  precision?: number;
}) {
  return (
    <article className="metric-card">
      <div className="metric-label">
        {label}
        {detail && <InfoTooltip text={detail} />}
      </div>
      <div className="metric-value">
        {value.toFixed(precision)}
        {symbol && <span className="metric-symbol">{symbol}</span>}
      </div>
      <div className="metric-foot">
        {demo ? (
          <DemoDataBadge />
        ) : (
          <span className="api-badge">{liveLabel}</span>
        )}
        <span>{detail}</span>
      </div>
    </article>
  );
}
export function ResultCard({
  title,
  description,
  children,
  className = "",
  demo = false,
  provenance,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  demo?: boolean;
  provenance?: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {demo ? <DemoDataBadge /> : provenance}
      </div>
      {children}
    </section>
  );
}
export function ParameterSlider({
  label,
  value,
  onChange,
  max = 1,
  step = 0.01,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
  step?: number;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="field slider-field">
      <div className="label-row">
        <label htmlFor={id}>{label}</label>
        {(/reflectivity/i.test(label) ||
          /background/i.test(label) ||
          /channel noise/i.test(label)) && (
          <InfoTooltip
            text={
              /reflectivity/i.test(label)
                ? explanations.reflectivity
                : /background/i.test(label)
                  ? explanations.background
                  : explanations.channel
            }
          />
        )}
        <output htmlFor={id}>{value.toFixed(2)}</output>
      </div>
      <input
        id={id}
        type="range"
        aria-valuetext={`${value.toFixed(2)} of ${max.toFixed(2)}`}
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="range-ends">
        <span>0.00</span>
        <span>{max.toFixed(2)}</span>
      </div>
    </div>
  );
}
export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: readonly (string | number)[];
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
export function SimulationPanel({
  children,
  buttonLabel,
  loadingLabel = "Running Qiskit simulation…",
  liveDescription = "Runs the selected ideal Bell state through the Qiskit backend.",
  loading,
  onRun,
  error,
  status,
  demo,
}: {
  children: ReactNode;
  buttonLabel: string;
  loadingLabel?: string;
  liveDescription?: string;
  loading: boolean;
  onRun: () => void;
  error?: string;
  status?: string;
  demo: boolean;
}) {
  return (
    <aside className="panel simulation-panel">
      <div className="panel-heading">
        <h2>
          <SlidersHorizontal size={16} /> Parameters
        </h2>
        <span className="micro">CONFIGURE</span>
      </div>
      <div className="control-stack">
        {children}
        <Button
          onClick={onRun}
          disabled={loading}
          aria-busy={loading}
          className="run-button"
        >
          {loading ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Play size={15} />
          )}{" "}
          {loading
            ? demo
              ? "Loading demo fixture…"
              : loadingLabel
            : buttonLabel}
        </Button>
        <p className="control-hint">
          {demo
            ? "Loads illustrative frontend fixtures. No Qiskit computation is performed."
            : liveDescription}
        </p>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <p className="run-status" role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </aside>
  );
}
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="note">
      <InfoTooltip text="Scientific scope and interpretation" />
      <div>{children}</div>
    </div>
  );
}
export function EmptyResults({
  loading = false,
  error,
}: {
  loading?: boolean;
  error?: string;
}) {
  return (
    <div className="panel empty-state" aria-busy={loading}>
      <FlaskConical size={32} />
      <h2>
        {loading
          ? "Simulation in progress"
          : error
            ? "No successful result yet"
            : "Ready for a simulation"}
      </h2>
      <p>
        {loading
          ? "Results will appear when the calculation completes."
          : error
            ? "Review the error beside the controls, then retry. No fixture values have been substituted."
            : "Choose your parameters and run an experiment. No results have been received from the backend."}
      </p>
    </div>
  );
}
