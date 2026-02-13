import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ToolStats } from "@/lib/api.ts";

interface Props {
  data: ToolStats[];
}

const COLORS = [
  "oklch(0.488 0.243 264.376)",
  "oklch(0.696 0.17 162.48)",
  "oklch(0.769 0.188 70.08)",
  "oklch(0.627 0.265 303.9)",
  "oklch(0.645 0.246 16.439)",
  "oklch(0.55 0.2 200)",
  "oklch(0.6 0.22 100)",
  "oklch(0.7 0.15 250)",
];

export function ToolCallsChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.call_count - a.call_count).slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Tool Usage Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">
          {sorted.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No tool usage data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sorted} layout="vertical" margin={{ left: 80 }}>
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "oklch(0.708 0 0)" }}
                  axisLine={{ stroke: "oklch(0.269 0 0)" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="tool_name"
                  tick={{ fontSize: 11, fill: "oklch(0.708 0 0)" }}
                  axisLine={false}
                  tickLine={false}
                  width={75}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.205 0 0)",
                    border: "1px solid oklch(0.269 0 0)",
                    borderRadius: "8px",
                    color: "oklch(0.985 0 0)",
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [value, "Calls"]}
                />
                <Bar dataKey="call_count" radius={[0, 4, 4, 0]} name="Calls">
                  {sorted.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
