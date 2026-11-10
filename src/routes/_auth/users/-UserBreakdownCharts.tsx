import { theme } from "antd";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatsLevelBreakdown, StatsSubjectBreakdown } from "@/api/schemas";
import { trendColor } from "./-UserTrendChart";

/** 与 recharts v3 `TooltipContentProps` 兼容的最小类型（payload 为只读数组）。 */
type TooltipRenderProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
};

function tooltipFrame(token: ReturnType<typeof theme.useToken>["token"], rows: React.ReactNode) {
  return (
    <div
      style={{
        background: token.colorBgElevated,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: `${token.paddingXS}px ${token.paddingSM}px`,
        boxShadow: token.boxShadowSecondary,
        fontSize: token.fontSizeSM,
        color: token.colorTextSecondary,
      }}
    >
      {rows}
    </div>
  );
}

/** 各科目正确率：横向条形图，单色（identity 由轴标签承担），条端直接标值。 */
export function SubjectAccuracyBars({
  breakdown,
  darkMode,
}: {
  breakdown: StatsSubjectBreakdown[];
  darkMode: boolean;
}) {
  const { token } = theme.useToken();
  const color = trendColor(darkMode);

  if (!breakdown.some((item) => item.total > 0)) {
    return (
      <div
        style={{
          height: 160,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: token.colorTextTertiary,
        }}
      >
        暂无做题记录
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={breakdown.length * 44 + 16}>
      <BarChart
        data={breakdown}
        layout="vertical"
        margin={{ top: 4, right: 56, bottom: 4, left: 0 }}
      >
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={48}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: token.fontSizeSM, fill: token.colorText }}
        />
        <Tooltip
          cursor={false}
          content={({ active, payload }: TooltipRenderProps) => {
            if (!active || !payload?.length) return null;
            const item = payload[0].payload as StatsSubjectBreakdown;
            return tooltipFrame(
              token,
              <>
                <div style={{ fontWeight: 600, color: token.colorText }}>
                  {item.accuracy != null ? `${item.accuracy}%` : "—"}
                </div>
                <div>
                  答对 {item.correct}/{item.total}
                </div>
              </>,
            );
          }}
        />
        <Bar dataKey="accuracy" barSize={16} radius={[0, 4, 4, 0]} fill={color}>
          <LabelList
            dataKey="accuracy"
            position="right"
            formatter={(v: unknown) => (typeof v === "number" ? `${v}%` : "")}
            style={{ fill: token.colorTextSecondary, fontSize: token.fontSizeSM }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 各级别做题量：纵向柱图，单色，柱顶直接标值。 */
export function LevelDistributionColumns({
  breakdown,
  darkMode,
}: {
  breakdown: StatsLevelBreakdown[];
  darkMode: boolean;
}) {
  const { token } = theme.useToken();
  const color = trendColor(darkMode);

  if (!breakdown.some((item) => item.total > 0)) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: token.colorTextTertiary,
        }}
      >
        暂无做题记录
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={breakdown} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={token.colorBorderSecondary} strokeWidth={1} />
        <XAxis
          dataKey="level"
          tickLine={false}
          axisLine={{ stroke: token.colorBorderSecondary }}
          tick={{ fontSize: token.fontSizeSM, fill: token.colorText }}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={36}
          tick={{ fontSize: token.fontSizeSM, fill: token.colorTextSecondary }}
        />
        <Tooltip
          cursor={false}
          content={({ active, payload }: TooltipRenderProps) => {
            if (!active || !payload?.length) return null;
            const item = payload[0].payload as StatsLevelBreakdown;
            return tooltipFrame(
              token,
              <>
                <div style={{ fontWeight: 600, color: token.colorText }}>{item.level}</div>
                <div>
                  做题 {item.total} · 答对 {item.correct}
                  {item.accuracy != null ? ` · 正确率 ${item.accuracy}%` : ""}
                </div>
              </>,
            );
          }}
        />
        <Bar dataKey="total" barSize={24} radius={[4, 4, 0, 0]} fill={color}>
          <LabelList
            dataKey="total"
            position="top"
            formatter={(v: unknown) => (typeof v === "number" && v > 0 ? String(v) : "")}
            style={{ fill: token.colorTextSecondary, fontSize: token.fontSizeSM }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
