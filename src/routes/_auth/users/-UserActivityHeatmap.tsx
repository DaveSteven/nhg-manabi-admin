import { memo } from "react";
import { Tooltip, theme } from "antd";
import type { StatsActivityDay } from "@/api/schemas";

/**
 * GitHub 风格做题热力图（365 天，列为周、行为周一→周日）。
 * 颜色 = 单一蓝色顺序色阶（已通过 dataviz --ordinal 校验）：
 * 亮色 #69b1ff→#003eb3；暗色翻转锚点 #0958d9→#91caff（越活跃越亮）。
 */
const HEAT_RAMP = {
  light: ["#69b1ff", "#4096ff", "#1677ff", "#0958d9", "#003eb3"],
  dark: ["#0958d9", "#1677ff", "#4096ff", "#69b1ff", "#91caff"],
} as const;

/** 当日做题数 → 色阶档位；0 = 空格子 */
const BIN_THRESHOLDS = [1, 5, 15, 30, 50] as const;

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const WEEKDAY_MARKED = [0, 2, 4]; // 一 / 三 / 五

const CELL = 10;
const GAP = 2;

type HeatCell = (StatsActivityDay & { bin: number }) | null;

function mondayIndex(dateStr: string): number {
  // 周一=0 … 周日=6
  return (new Date(`${dateStr}T00:00:00`).getDay() + 6) % 7;
}

function binFor(answered: number): number {
  let bin = -1;
  for (let i = 0; i < BIN_THRESHOLDS.length; i += 1) {
    if (answered >= BIN_THRESHOLDS[i]) bin = i;
  }
  return bin;
}

function UserActivityHeatmapImpl({ activity, darkMode }: { activity: StatsActivityDay[]; darkMode: boolean }) {
  const { token } = theme.useToken();
  const colors = darkMode ? HEAT_RAMP.dark : HEAT_RAMP.light;
  const emptyColor = token.colorFillQuaternary;

  // 以周一为列首对齐；开头空位补 null
  const leading: HeatCell[] = activity.length
    ? Array.from({ length: mondayIndex(activity[0].date) }, () => null)
    : [];
  const cells: HeatCell[] = [
    ...leading,
    ...activity.map((day) => ({ ...day, bin: binFor(day.answered) })),
  ];
  const weeks: HeatCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  // 月份标签：每列取首格日期，月份变化时标注
  const monthLabels: (string | null)[] = weeks.map((week, i) => {
    const first = week.find((cell) => cell != null);
    if (!first) return null;
    const month = Number(first.date.slice(5, 7));
    if (i === 0) return `${month}月`;
    const prev = weeks[i - 1].find((cell) => cell != null);
    return prev && Number(prev.date.slice(5, 7)) !== month ? `${month}月` : null;
  });

  const cellStyle = (bin: number): React.CSSProperties => ({
    width: CELL,
    height: CELL,
    borderRadius: 2,
    flexShrink: 0,
    background: bin < 0 ? emptyColor : colors[bin],
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: GAP, overflowX: "auto" }}>
      {/* 月份标签：单个相对定位容器，与色块网格共享坐标系（左侧让出周标签列 24px + gap）。
          之前每列一个 width:CELL 的零高度槽 + nowrap 绝对定位标签，行高塌陷导致文字压住首行色块，
          且 marginLeft 24 与网格实际偏移 24+GAP 错 2px。 */}
      <div style={{ position: "relative", height: 16, marginLeft: 24 + GAP }}>
        {monthLabels.map((label, i) =>
          label ? (
            <span
              key={i}
              style={{
                position: "absolute",
                left: i * (CELL + GAP),
                whiteSpace: "nowrap",
                fontSize: token.fontSizeSM,
                lineHeight: "16px",
                color: token.colorTextSecondary,
              }}
            >
              {label}
            </span>
          ) : null,
        )}
      </div>
      <div style={{ display: "flex", gap: GAP }}>
        <div style={{ width: 24, display: "flex", flexDirection: "column", gap: GAP }}>
          {WEEKDAY_LABELS.map((label, row) => (
            <div
              key={label}
              style={{
                height: CELL,
                fontSize: token.fontSizeSM,
                lineHeight: `${CELL}px`,
                color: token.colorTextTertiary,
              }}
            >
              {WEEKDAY_MARKED.includes(row) ? label : ""}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
            {Array.from({ length: 7 }, (_, di) => {
              const cell = week[di];
              if (!cell) {
                return <div key={di} style={cellStyle(-1)} />;
              }
              return (
                <Tooltip
                  key={di}
                  title={`${cell.date}：做题 ${cell.answered} 题，对 ${cell.correct} 题`}
                >
                  <div style={{ ...cellStyle(cell.bin), cursor: "default" }} />
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: GAP + 2,
          alignSelf: "flex-end",
          fontSize: token.fontSizeSM,
          color: token.colorTextTertiary,
        }}
      >
        少
        {colors.map((color) => (
          <div key={color} style={{ ...cellStyle(0), background: color }} />
        ))}
        多
      </div>
    </div>
  );
}

export const UserActivityHeatmap = memo(UserActivityHeatmapImpl);
