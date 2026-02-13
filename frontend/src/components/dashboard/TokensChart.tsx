import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  data: { date: string; tokens_in: number; tokens_out: number }[];
}

export function TokensChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Token Usage Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No token data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.696 0.17 162.48)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.696 0.17 162.48)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.769 0.188 70.08)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.769 0.188 70.08)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.269 0 0)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "oklch(0.708 0 0)" }}
                  axisLine={{ stroke: "oklch(0.269 0 0)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "oklch(0.708 0 0)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.205 0 0)",
                    border: "1px solid oklch(0.269 0 0)",
                    borderRadius: "8px",
                    color: "oklch(0.985 0 0)",
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "oklch(0.708 0 0)" }}
                />
                <Area
                  type="monotone"
                  dataKey="tokens_in"
                  stroke="oklch(0.696 0.17 162.48)"
                  fill="url(#gradIn)"
                  strokeWidth={2}
                  name="Tokens In"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="tokens_out"
                  stroke="oklch(0.769 0.188 70.08)"
                  fill="url(#gradOut)"
                  strokeWidth={2}
                  name="Tokens Out"
                  stackId="1"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
