import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from "recharts";

interface ControlChartProps {
  values: number[];
  ucl: number;
  lcl: number;
  cl: number;
  outOfControl?: number[];
  title?: string;
  yLabel?: string;
  height?: number;
  color?: string;
}

export const ControlChart = ({
  values,
  ucl,
  lcl,
  cl,
  outOfControl = [],
  yLabel,
  height = 220,
  color = "hsl(var(--primary))",
}: ControlChartProps) => {
  const data = values.map((v, i) => ({ i: i + 1, v, isOoc: outOfControl.includes(i) }));
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 60, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="i" stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={["auto", "auto"]} label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 } : undefined} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <ReferenceLine y={ucl} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `UCL ${ucl.toFixed(3)}`, position: "right", fill: "hsl(var(--destructive))", fontSize: 10 }} />
          <ReferenceLine y={cl} stroke="hsl(var(--success))" strokeDasharray="4 4" label={{ value: `CL ${cl.toFixed(3)}`, position: "right", fill: "hsl(var(--success))", fontSize: 10 }} />
          <ReferenceLine y={lcl} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `LCL ${lcl.toFixed(3)}`, position: "right", fill: "hsl(var(--destructive))", fontSize: 10 }} />
          <Line
            type="linear"
            dataKey="v"
            stroke={color}
            strokeWidth={1.8}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              const isOoc = payload.isOoc;
              return (
                <Dot
                  key={`dot-${payload?.i ?? payload?.index ?? Math.random()}`}
                  cx={cx}
                  cy={cy}
                  r={isOoc ? 5 : 3}
                  fill={isOoc ? "hsl(var(--destructive))" : color}
                  stroke={isOoc ? "hsl(var(--destructive))" : color}
                />
              );
            }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
