import { Flex, Spin, Typography, theme } from "antd";
import type { CSSProperties } from "react";
import type { ExamQuestionListItem } from "@/api/schemas";

const { Text } = Typography;

/** 答案已确认的口径：与试卷进度统计一致。 */
export const ANSWER_CONFIRMED_STATUSES = new Set(["auto_verified", "verified", "corrected"]);

export type QuestionReviewStatus = "done" | "disputed" | "pending";

export function questionReviewStatus(item: ExamQuestionListItem): QuestionReviewStatus {
  if (item.answer_status === "disputed" || item.analysis_status === "disputed") {
    return "disputed";
  }
  const answerOk = ANSWER_CONFIRMED_STATUSES.has(item.answer_status);
  const analysisOk = item.analysis_status === "reviewed";
  return answerOk && analysisOk ? "done" : "pending";
}

/** 修订页顶栏的整卷进度统计。 */
export function countReviewProgress(items: ExamQuestionListItem[]): {
  answerDone: number;
  analysisDone: number;
  disputed: number;
} {
  return {
    answerDone: items.filter((item) => ANSWER_CONFIRMED_STATUSES.has(item.answer_status)).length,
    analysisDone: items.filter((item) => item.analysis_status === "reviewed").length,
    disputed: items.filter(
      (item) => item.answer_status === "disputed" || item.analysis_status === "disputed",
    ).length,
  };
}

/** 试卷内的大分类固定顺序（与 JLPT 卷面顺序一致）。 */
const CATEGORY_ORDER = ["vocabulary", "grammar", "reading", "listening"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  vocabulary: "文字词汇",
  grammar: "文法",
  reading: "读解",
  listening: "听力",
};

export interface QuestionTile {
  item: ExamQuestionListItem;
  /** 学生端展示编号：非听力=全卷全局序号，听力=題組（問題）内序号。 */
  displayNumber: number;
}

export interface ProblemBlock {
  /** 学生端 examProblemLabel：layer.title 中的「問題n」，缺省用题组序号。 */
  problemLabel: string;
  tiles: QuestionTile[];
}

export interface CategorySection {
  category: string;
  label: string;
  items: ExamQuestionListItem[];
  problems: ProblemBlock[];
}

/**
 * 与学生端 `buildReviewProblemGroups` 相同的展示规则：
 * 大分类 → 問題n（题组）→ 方块编号；听力题组的编号在组内重新计数。
 */
export function groupByCategory(items: ExamQuestionListItem[]): CategorySection[] {
  const ordered = [...items].sort((a, b) => {
    if (a.layer_order !== b.layer_order) return a.layer_order - b.layer_order;
    return a.order_index - b.order_index;
  });

  // 学生端 displayNumber：全卷全局序号；听力按题组内序号。
  const layerCounters = new Map<number, number>();
  const tiles = new Map<number, QuestionTile>();
  ordered.forEach((item, index) => {
    const inLayer = (layerCounters.get(item.layer_id) ?? 0) + 1;
    layerCounters.set(item.layer_id, inLayer);
    const isListening = item.category === "listening";
    tiles.set(item.id, { item, displayNumber: isListening ? inLayer : index + 1 });
  });

  // 按题组聚块（保持卷面顺序），problemLabel 与学生端 examProblemLabel 一致。
  const blocks = new Map<number, ProblemBlock>();
  for (const item of ordered) {
    let block = blocks.get(item.layer_id);
    if (!block) {
      const fromTitle = /問題\s*(\d+)/.exec(item.layer_title)?.[1];
      block = { problemLabel: `問題${fromTitle ?? item.layer_order}`, tiles: [] };
      blocks.set(item.layer_id, block);
    }
    block.tiles.push(tiles.get(item.id)!);
  }

  const sections = new Map<string, CategorySection>();
  for (const block of blocks.values()) {
    const category = block.tiles[0]?.item.category ?? "";
    let section = sections.get(category);
    if (!section) {
      section = {
        category,
        label: CATEGORY_LABELS[category] ?? block.tiles[0]?.item.category_label ?? category,
        items: [],
        problems: [],
      };
      sections.set(category, section);
    }
    section.items.push(...block.tiles.map((tile) => tile.item));
    section.problems.push(block);
  }

  return [...sections.values()]
    .map((section) => ({ ...section, items: [...section.items] }))
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category as (typeof CATEGORY_ORDER)[number]) -
        CATEGORY_ORDER.indexOf(b.category as (typeof CATEGORY_ORDER)[number]),
    );
}

/** Decode HTML entities and strip tags from source markup (same as the student app). */
export function plainText(value: string): string {
  const decoder = document.createElement("textarea");
  decoder.innerHTML = String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decoder.value.replace(/ /g, " ").trim();
}

export interface LayerTile {
  id: number;
  displayNumber: number;
  title: string;
  options: ExamQuestionListItem["options"];
  correctOptionId: number | null;
}

export interface LayerPassageGroup {
  /** 该组共享的文章（短文型読解每组一篇文章；无文章的题各自成组、passage 为空）。 */
  passage: string;
  tiles: LayerTile[];
}

export interface LayerGroup {
  problemLabel: string;
  layerTitle: string;
  /** 题组内按共享文章再分组——短文型读解每题一篇，長文型多题一篇。 */
  passageGroups: LayerPassageGroup[];
}

/**
 * 取某个题组（問題）的展示信息；编号规则与学生端一致：
 * 非听力=全卷全局序号，听力=題組内序号。
 */
export function buildLayerGroup(items: ExamQuestionListItem[], layerId: number): LayerGroup | null {
  const ordered = [...items].sort((a, b) => {
    if (a.layer_order !== b.layer_order) return a.layer_order - b.layer_order;
    return a.order_index - b.order_index;
  });
  const layerCounters = new Map<number, number>();
  const numberById = new Map<number, number>();
  for (const item of ordered) {
    const inLayer = (layerCounters.get(item.layer_id) ?? 0) + 1;
    layerCounters.set(item.layer_id, inLayer);
    numberById.set(item.id, item.category === "listening" ? inLayer : ordered.indexOf(item) + 1);
  }

  const members = ordered.filter((item) => item.layer_id === layerId);
  if (members.length === 0) return null;
  const fromTitle = /問題\s*(\d+)/.exec(members[0].layer_title)?.[1];
  const tiles: LayerTile[] = members.map((item) => ({
    id: item.id,
    displayNumber: numberById.get(item.id) ?? item.order_index,
    title: item.title,
    options: item.options,
    correctOptionId: item.correct_option_id,
  }));

  // 按共享文章分组（与学生端 groupQuestionsByPassage 相同的相邻合并规则）。
  const passageGroups: LayerPassageGroup[] = [];
  for (const tile of tiles) {
    const item = members.find((row) => row.id === tile.id)!;
    const passage = item.passage.trim() ? item.passage : "";
    const previous = passageGroups[passageGroups.length - 1];
    if (previous && previous.passage === passage && passage !== "") {
      previous.tiles.push(tile);
    } else {
      passageGroups.push({ passage, tiles: [tile] });
    }
  }

  return {
    problemLabel: `問題${fromTitle ?? members[0].layer_order}`,
    layerTitle: members[0].layer_title,
    passageGroups,
  };
}

interface PaperQuestionListProps {
  style?: CSSProperties;
  sections: CategorySection[];
  total: number;
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function PaperQuestionList({
  style,
  sections,
  total,
  loading,
  selectedId,
  onSelect,
}: PaperQuestionListProps) {
  const { token } = theme.useToken();

  const tileStyle = (status: QuestionReviewStatus, selected: boolean): CSSProperties => {
    if (selected) {
      return {
        background: token.colorPrimary,
        borderColor: token.colorPrimary,
        color: token.colorTextLightSolid,
        fontWeight: 600,
      };
    }
    if (status === "done") {
      return {
        background: token.colorSuccessBg,
        borderColor: token.colorSuccessBorder,
        color: token.colorSuccess,
      };
    }
    if (status === "disputed") {
      return {
        background: token.colorWarningBg,
        borderColor: token.colorWarningBorder,
        color: token.colorWarning,
      };
    }
    return {
      background: token.colorBgContainer,
      borderColor: token.colorBorderSecondary,
      color: token.colorTextSecondary,
    };
  };

  return (
    <Flex
      vertical
      gap={token.marginSM}
      style={{
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: token.paddingSM,
        ...style,
      }}
    >
      <Text strong>{total} 道小题</Text>

      <Flex vertical gap={token.marginMD} style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto" }}>
        {loading ? (
          <Flex align="center" justify="center" style={{ padding: token.paddingLG }}>
            <Spin />
          </Flex>
        ) : sections.length === 0 ? (
          <Typography.Text type="secondary" style={{ textAlign: "center", padding: token.paddingLG }}>
            这份试卷还没有题目
          </Typography.Text>
        ) : (
          sections.map((section) => {
            const done = section.items.filter((item) => questionReviewStatus(item) === "done").length;
            return (
              <div key={section.category}>
                <Flex justify="space-between" align="center" gap={token.marginXS}>
                  <Text strong style={{ fontSize: token.fontSizeSM }}>
                    {section.label}
                  </Text>
                  <Text
                    type={done === section.items.length && section.items.length > 0 ? "success" : "secondary"}
                    style={{ fontSize: token.fontSizeSM }}
                  >
                    {done}/{section.items.length}
                  </Text>
                </Flex>
                {section.problems.map((problem) => (
                  <div key={`${section.category}-${problem.problemLabel}-${problem.tiles[0]?.item.layer_id}`}>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      {problem.problemLabel}
                    </Text>
                    <Flex wrap="wrap" gap={token.marginXXS} style={{ marginTop: 2, marginBottom: token.marginXXS }}>
                      {problem.tiles.map(({ item, displayNumber }) => {
                        const selected = selectedId === item.id;
                        const status = questionReviewStatus(item);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => onSelect(item.id)}
                            title={`${problem.problemLabel} ${displayNumber}番 · ${plainText(item.title).slice(0, 60)}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 32,
                              height: 32,
                              cursor: "pointer",
                              borderRadius: token.borderRadius,
                              border: `1px solid ${token.colorBorder}`,
                              font: "inherit",
                              fontSize: token.fontSizeSM,
                              ...tileStyle(status, selected),
                              transition: "all 0.2s",
                            }}
                          >
                            {displayNumber}
                          </button>
                        );
                      })}
                    </Flex>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </Flex>
    </Flex>
  );
}
