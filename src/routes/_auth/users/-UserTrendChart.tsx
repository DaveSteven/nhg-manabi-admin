import { theme } from "antd";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatsTrendPoint } from "@/api/schemas";

export type TrendMetric = "volume" | "accuracy";
export type TrendGranularity = "day" | "week" | "month";

const GRAN_DAYS: Record<TrendGranularity, number> = { day: 90, week: 180, month: 365 };
export { GRAN_DAYS };

/** 单系列折线：亮色 antd blue-6，暗色换更亮的 blue-4（对暗表面 ≥3:1）。 */
export function trendColor(darkMode: boolean): string {
  return darkMode ? "#69b1ff" : "#1677ff";
}

function formatPeriod(period: string, granularity: TrendGranularity): string {
  const [year, month, day] = period.split("-");
  if (granularity === "month") return `${year}/${Number(month)}`;
  return `${Number(month)}/${Number(day ?? "")}`;
}

type TooltipPayload = { active?: boolean; payload?: { payload: StatsTrendPoint }[] };

function TrendTooltipContent({
  active,
  payload,
  granularity,
  metric,
  unit = "题",
}: TooltipPayload & {
  granularity: TrendGranularity;
  metric: TrendMetric;
  unit?: string;
}) {
  const { token } = theme.useToken();
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div
      style={{
        background: token.colorBgElevated,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: `${token.paddingXS}px ${token.paddingSM}px`,
        boxShadow: token.boxShadowSecondary,
      }}
    >
      <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
        {formatPeriod(point.period, granularity)}
      </div>
      <div style={{ fontWeight: 600, color: token.colorText }}>
        {metric === "volume" ? `${point.answered} ${unit}` : `${point.accuracy != null ? `${point.accuracy}%` : "—"}`}
      </div>
      {unit === "题" ? (
        <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
          答对 {point.correct}/{point.answered} · {point.attempts} 次练习
        </div>
      ) : null}
    </div>
  );
}

export function UserTrendChart({
  points,
  metric,
  granularity,
  darkMode,
  unit,
}: {
  points: StatsTrendPoint[];
  metric: TrendMetric;
  granularity: TrendGranularity;
  darkMode: boolean;
  /** tooltip 数值单位，默认 "题"；注册趋势等复用时传 "人"。 */
  unit?: string;
}) {
  const { token } = theme.useToken();
  const color = trendColor(darkMode);
  const dataKey = metric === "volume" ? "answered" : "accuracy";

  if (!points.length) {
    return (
      <div
        style={{
          height: 240,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: token.colorTextTertiary,
        }}
      >
        该时间段内没有做题记录
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={token.colorBorderSecondary} strokeWidth={1} />
        <XAxis
          dataKey="period"
          tickFormatter={(v: string) => formatPeriod(v, granularity)}
          tick={{ fontSize: token.fontSizeSM, fill: token.colorTextSecondary }}
          axisLine={{ stroke: token.colorBorderSecondary }}
          tickLine={false}
          minTickGap={32}
        />
        <YAxis
          domain={metric === "accuracy" ? [0, 100] : [0, "auto"]}
          ticks={metric === "accuracy" ? [0, 25, 50, 75, 100] : undefined}
          allowDecimals={false}
          tick={{ fontSize: token.fontSizeSM, fill: token.colorTextSecondary }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ stroke: token.colorBorderSecondary, strokeWidth: 1 }}
          content={<TrendTooltipContent granularity={granularity} metric={metric} unit={unit} />}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          dot={false}
          connectNulls
          activeDot={{ r: 4, stroke: token.colorBgContainer, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
