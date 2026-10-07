"use client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from "recharts";
import type { Measurement, NoisePoint, ComparisonPoint } from "@/lib/types";
const axis = {
  stroke: "#7f8b9e",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
};
const tooltip = {
  contentStyle: {
    background: "#1b2230",
    border: "1px solid #364055",
    borderRadius: 8,
    color: "#e5eaf3",
    fontSize: 13,
  },
  labelStyle: { color: "#c7cddd" },
  itemStyle: { color: "#e5eaf3" },
};
export function MeasurementChart({ data }: { data: Measurement[] }) {
  return (
    <div
      className="chart"
      role="img"
      aria-label={`Measurement probabilities: ${data.map((d) => `${d.outcome}: ${d.probability * 100}%`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={data}
          margin={{ top: 15, right: 10, left: -15, bottom: 5 }}
        >
          <CartesianGrid
            stroke="#28303e"
            vertical={false}
            strokeDasharray="3 4"
          />
          <XAxis dataKey="outcome" {...axis} tickMargin={12} />
          <YAxis
            {...axis}
            domain={[0, 1]}
            tickFormatter={(v) => `${v * 100}%`}
          />
          <Tooltip
            {...tooltip}
            cursor={{ fill: "#ffffff05" }}
            formatter={(v) => [
              `${(Number(v) * 100).toFixed(1)}%`,
              "Probability",
            ]}
          />
          <Bar
            dataKey="probability"
            name="Probability"
            radius={[5, 5, 0, 0]}
            maxBarSize={70}
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell
                key={d.outcome}
                fill={i === 0 || i === 3 ? "#9690ff" : "#50bdcf"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function NoiseTrendChart({ data }: { data: NoisePoint[] }) {
  return (
    <div
      className="chart"
      role="img"
      aria-label="Illustrative concurrence falls from 1 to 0 as noise strength increases from 0 to 0.5"
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={data}
          margin={{ top: 15, right: 15, left: -20, bottom: 20 }}
        >
          <defs>
            <linearGradient id="concurrence-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9690ff" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#9690ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#28303e"
            vertical={false}
            strokeDasharray="3 4"
          />
          <XAxis
            {...axis}
            dataKey="noise"
            tickFormatter={(v) => Number(v).toFixed(2)}
            label={{
              value: "Noise strength",
              position: "bottom",
              fill: "#8390a5",
              fontSize: 12,
            }}
          />
          <YAxis {...axis} domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} />
          <Tooltip
            {...tooltip}
            labelFormatter={(v) => `Noise strength: ${v}`}
          />
          <Area
            type="monotone"
            dataKey="concurrence"
            name="Concurrence"
            stroke="#a39aff"
            strokeWidth={2.5}
            fill="url(#concurrence-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function StrategyChart({
  data,
  xLabel,
}: {
  data: ComparisonPoint[];
  xLabel: string;
}) {
  return (
    <div
      className="chart tall-chart"
      role="img"
      aria-label={`Illustrative quantum-correlated and unentangled control probabilities versus ${xLabel}`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 15, left: -15, bottom: 20 }}
        >
          <CartesianGrid
            stroke="#28303e"
            vertical={false}
            strokeDasharray="3 4"
          />
          <XAxis
            {...axis}
            type="number"
            domain={["dataMin", "dataMax"]}
            dataKey="x"
            label={{
              value: xLabel,
              position: "bottom",
              fill: "#8390a5",
              fontSize: 12,
              offset: 5,
            }}
          />
          <YAxis {...axis} domain={[0, 1]} />
          <Tooltip {...tooltip} />
          <Legend verticalAlign="top" height={40} iconType="plainline" />
          <Line
            type="monotone"
            dataKey="quantum"
            name="Quantum Correlated"
            stroke="#a39aff"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="control"
            name="Unentangled Control"
            stroke="#50bdcf"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function ROCCurve({ data }: { data: ComparisonPoint[] }) {
  return <StrategyChart data={data} xLabel="False alarm probability" />;
}

export function NoiseSweepChart({
  data,
  readout,
}: {
  data: import("@/lib/types").NoiseSweepPoint[];
  readout: boolean;
}) {
  return (
    <div
      className="chart"
      role="img"
      aria-label={`Exact noise sweep: ${data.map((p) => `p ${p.noise}: concurrence ${p.concurrence}${readout ? `, expected measured ZZ ${p.measuredZZCorrelation}` : ""}`).join("; ")}`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart
          data={data}
          margin={{ top: 15, right: 15, left: -15, bottom: 20 }}
        >
          <CartesianGrid
            stroke="#28303e"
            vertical={false}
            strokeDasharray="3 4"
          />
          <XAxis
            {...axis}
            dataKey="noise"
            type="number"
            domain={[0, 0.5]}
            tickFormatter={(v) => Number(v).toFixed(2)}
            label={{
              value: "Noise strength",
              position: "bottom",
              fill: "#8390a5",
              fontSize: 12,
            }}
          />
          <YAxis {...axis} domain={readout ? [-1, 1] : [0, 1]} />
          <Tooltip
            {...tooltip}
            labelFormatter={(v) => `Noise strength: ${Number(v).toFixed(2)}`}
            formatter={(v) => Number(v).toFixed(4)}
          />
          <Legend
            verticalAlign="top"
            height={readout ? 64 : 36}
            wrapperStyle={{ fontSize: 12 }}
            iconType="plainline"
          />
          <Line
            type="linear"
            dataKey="concurrence"
            name="Exact concurrence"
            stroke="#a39aff"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
          {readout && (
            <Line
              type="linear"
              dataKey="measuredZZCorrelation"
              name="Expected measured ZZ (exact)"
              stroke="#50bdcf"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReceiverScoreChart({
  meanH0,
  meanH1,
  threshold,
}: {
  meanH0: number;
  meanH1: number;
  threshold: number;
}) {
  const data = [
    { name: "H0 mean", score: meanH0 },
    { name: "H1 mean", score: meanH1 },
    { name: "Threshold", score: threshold },
  ];
  return (
    <div
      className="chart"
      role="img"
      aria-label={`Receiver scores: mean H0 ${meanH0}, mean H1 ${meanH1}, threshold ${threshold}. Means, not distributions.`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={data}
          margin={{ top: 15, right: 10, left: -15, bottom: 5 }}
        >
          <CartesianGrid
            stroke="#28303e"
            vertical={false}
            strokeDasharray="3 4"
          />
          <XAxis {...axis} dataKey="name" />
          <YAxis {...axis} domain={[0, 1]} />
          <Tooltip
            {...tooltip}
            cursor={{ fill: "#ffffff05" }}
            formatter={(v) => [Number(v).toFixed(4), "Bell-match score"]}
          />
          <Bar
            dataKey="score"
            radius={[5, 5, 0, 0]}
            maxBarSize={80}
            isAnimationActive={false}
          >
            <Cell fill="#50bdcf" />
            <Cell fill="#9690ff" />
            <Cell fill="#d5ae67" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ComparisonROCChart({
  quantum,
  control,
}: {
  quantum: import("@/lib/types").ROCPoint[];
  control: import("@/lib/types").ROCPoint[];
}) {
  return (
    <div
      className="chart tall-chart"
      role="img"
      aria-label={`Live empirical ROC: quantum ${quantum.length} points, control ${control.length} points; both run from (0,0) to (1,1).`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart margin={{ top: 10, right: 15, left: -10, bottom: 25 }}>
          <CartesianGrid stroke="#28303e" strokeDasharray="3 4" />
          <XAxis
            {...axis}
            type="number"
            dataKey="falseAlarmProbability"
            domain={[0, 1]}
            label={{
              value: "False Alarm Probability",
              position: "bottom",
              fill: "#8390a5",
              fontSize: 12,
            }}
          />
          <YAxis
            {...axis}
            type="number"
            domain={[0, 1]}
            label={{
              value: "Detection Probability",
              angle: -90,
              position: "insideLeft",
              fill: "#8390a5",
              fontSize: 11,
              dx: 12,
            }}
          />
          <Tooltip
            {...tooltip}
            labelFormatter={(v) => `False alarm: ${Number(v).toFixed(3)}`}
            formatter={(v) => Number(v).toFixed(3)}
          />
          <Legend
            verticalAlign="top"
            height={60}
            wrapperStyle={{ fontSize: 12 }}
            iconType="plainline"
          />
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ]}
            stroke="#68758a"
            strokeDasharray="4 4"
          />
          <Line
            data={quantum}
            type="linear"
            dataKey="detectionProbability"
            name="Quantum-correlated"
            stroke="#a39aff"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            data={control}
            type="linear"
            dataKey="detectionProbability"
            name="Unentangled control"
            stroke="#50bdcf"
            strokeWidth={2.5}
            strokeDasharray="5 3"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function ComparisonErrorChart({
  data,
}: {
  data: import("@/lib/types").ComparisonSweepPoint[];
}) {
  return (
    <div
      className="chart tall-chart"
      role="img"
      aria-label={`Live estimated error probabilities versus background noise: ${data.map((p) => `${p.backgroundNoise}: quantum ${p.quantum.errorProbability}, control ${p.control.errorProbability}`).join("; ")}`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 15, left: -10, bottom: 25 }}
        >
          <CartesianGrid stroke="#28303e" strokeDasharray="3 4" />
          <XAxis
            {...axis}
            type="number"
            dataKey="backgroundNoise"
            domain={[0, 0.8]}
            label={{
              value: "Background Noise",
              position: "bottom",
              fill: "#8390a5",
              fontSize: 12,
            }}
          />
          <YAxis
            {...axis}
            domain={[0, 1]}
            label={{
              value: "Estimated Error Probability",
              angle: -90,
              position: "insideLeft",
              fill: "#8390a5",
              fontSize: 11,
              dx: 12,
            }}
          />
          <Tooltip
            {...tooltip}
            labelFormatter={(v) => `Background: ${Number(v).toFixed(2)}`}
            formatter={(v) => Number(v).toFixed(3)}
          />
          <Legend
            verticalAlign="top"
            height={60}
            wrapperStyle={{ fontSize: 12 }}
            iconType="plainline"
          />
          <Line
            type="linear"
            dataKey="quantum.errorProbability"
            name="Quantum-correlated"
            stroke="#a39aff"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="control.errorProbability"
            name="Unentangled control"
            stroke="#50bdcf"
            strokeWidth={2.5}
            strokeDasharray="5 3"
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
