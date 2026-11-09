import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Flex, Input, Progress, Select, Spin, Tag, Typography, theme } from "antd";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod/v4";
import { useEffect, useState } from "react";
import { EXAM_LEVELS } from "@/api/schemas";
import type { AdminExamListItem } from "@/api/schemas";
import { fetchAdminExams } from "@/api/examQuestion";

/** All keys optional so navigating here (e.g. back from a paper) needs no params. */
const ExamListSearchSchema = z.object({
  q: z.string().catch("").optional(),
  level: z.string().catch("").optional(),
  year: z.string().catch("").optional(),
  order: z.enum(["recent", "todo"]).catch("recent").optional(),
});

export const Route = createFileRoute("/_auth/exam-questions/")({
  validateSearch: (search) => ExamListSearchSchema.parse(search),
  component: ExamPapersPage,
});

/** 年份下拉：当前年份往前推到 2010（JLPT 数据大致从这一年起）。 */
const EXAM_YEAR_MIN = 2010;

function examYearOptions(): Array<{ value: string; label: string }> {
  const years: Array<{ value: string; label: string }> = [];
  for (let year = new Date().getFullYear(); year >= EXAM_YEAR_MIN; year -= 1) {
    years.push({ value: String(year), label: `${year}年` });
  }
  return years;
}

/** exam_date (epoch milliseconds) → "2022年12月" */
function examDateLabel(examDate: number | null): string {
  if (!examDate) return "日期未知";
  const date = new Date(examDate);
  if (Number.isNaN(date.getTime())) return "日期未知";
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

/** 未完成 = 答案或解析任一未达完成口径。 */
function unfinishedRatio(paper: AdminExamListItem): number {
  const answerRatio = paper.question_count > 0 ? paper.answer_confirmed / paper.question_count : 1;
  const analysisRatio = paper.question_count > 0 ? paper.analysis_reviewed / paper.question_count : 1;
  return answerRatio + analysisRatio;
}

function PaperCard({
  paper,
  onSelect,
}: {
  paper: AdminExamListItem;
  onSelect: (id: number) => void;
}) {
  const { token } = theme.useToken();
  const answerPercent = paper.question_count > 0 ? Math.round((paper.answer_confirmed / paper.question_count) * 100) : 0;
  const analysisPercent = paper.question_count > 0 ? Math.round((paper.analysis_reviewed / paper.question_count) * 100) : 0;
  const finished = answerPercent === 100 && analysisPercent === 100;

  return (
    <button
      type="button"
      onClick={() => onSelect(paper.id)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: token.marginSM,
        width: "100%",
        height: "100%",
        textAlign: "left",
        cursor: "pointer",
        borderRadius: token.borderRadiusLG,
        padding: token.paddingMD,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        color: token.colorText,
        font: "inherit",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <Flex justify="space-between" align="flex-start" gap={token.marginXS}>
        <Flex vertical gap={token.marginXXS} style={{ minWidth: 0 }}>
          <Flex gap={token.marginXXS} align="center">
            <Tag color="processing" style={{ marginInlineEnd: 0 }}>
              {paper.level}
            </Tag>
            {finished ? (
              <Tag color="success" style={{ marginInlineEnd: 0 }}>
                已校完
              </Tag>
            ) : null}
          </Flex>
          <Typography.Text strong ellipsis style={{ fontSize: token.fontSizeLG }}>
            {paper.title}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            {examDateLabel(paper.exam_date)} · {paper.question_count} 题
          </Typography.Text>
        </Flex>
        <ChevronRight size={token.fontSizeLG} style={{ flexShrink: 0, marginTop: 4 }} />
      </Flex>

      <Flex vertical gap={token.marginXS}>
        <Flex align="center" gap={token.marginSM}>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, flexShrink: 0 }}>
            答案
          </Typography.Text>
          <Progress
            size="small"
            percent={answerPercent}
            strokeColor={token.colorPrimary}
            format={() => `${paper.answer_confirmed}/${paper.question_count}`}
            style={{ flex: 1, margin: 0 }}
          />
        </Flex>
        <Flex align="center" gap={token.marginSM}>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, flexShrink: 0 }}>
            解析
          </Typography.Text>
          <Progress
            size="small"
            percent={analysisPercent}
            strokeColor={token.colorSuccess}
            format={() => `${paper.analysis_reviewed}/${paper.question_count}`}
            style={{ flex: 1, margin: 0 }}
          />
        </Flex>
        {paper.disputed > 0 ? (
          <Flex gap={token.marginXXS} align="center">
            <AlertTriangle size={token.fontSizeSM} style={{ color: token.colorWarning }} />
            <Typography.Text type="warning" style={{ fontSize: token.fontSizeSM }}>
              {paper.disputed} 题存疑
            </Typography.Text>
          </Flex>
        ) : null}
      </Flex>
    </button>
  );
}

function ExamPapersPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { token } = theme.useToken();
  const [keyword, setKeyword] = useState(search.q ?? "");

  useEffect(() => {
    setKeyword(search.q ?? "");
  }, [search.q]);

  const examsQuery = useQuery({
    queryKey: ["admin-exams", search.q, search.level, search.year],
    queryFn: () =>
      fetchAdminExams({
        q: search.q || undefined,
        level: search.level || undefined,
        exam_year: search.year ? Number(search.year) : undefined,
      }),
  });

  const papers = examsQuery.data?.items ?? [];
  const sortedPapers =
    search.order === "todo"
      ? [...papers].sort(
          (a, b) =>
            (unfinishedRatio(a) < 2 ? 0 : 1) - (unfinishedRatio(b) < 2 ? 0 : 1) ||
            unfinishedRatio(a) - unfinishedRatio(b),
        )
      : papers;

  const openPaper = (id: number) => {
    void navigate({ to: "/exam-questions/$examId", params: { examId: String(id) } });
  };

  return (
    <Flex vertical gap={token.marginMD} style={{ flex: "1 1 0%", minHeight: 0 }}>
      <Flex component="form" gap={token.marginSM} wrap="wrap" onSubmit={(event) => event.preventDefault()}>
        <Input
          allowClear
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索试卷标题"
          style={{ width: 220 }}
          onPressEnter={() => void navigate({ search: { ...search, q: keyword.trim() } })}
          onBlur={() => {
            if (keyword.trim() !== (search.q ?? "")) void navigate({ search: { ...search, q: keyword.trim() } });
          }}
        />
        <Select
          aria-label="等级"
          value={search.level ?? ""}
          onChange={(value) => void navigate({ search: { ...search, level: value } })}
          options={[{ value: "", label: "全部等级" }, ...EXAM_LEVELS.map((v) => ({ value: v, label: v }))]}
          style={{ minWidth: 116 }}
        />
        <Select
          aria-label="考试年份"
          value={search.year ?? ""}
          onChange={(value) => void navigate({ search: { ...search, year: value } })}
          options={[{ value: "", label: "全部年份" }, ...examYearOptions()]}
          style={{ minWidth: 116 }}
        />
        <Select
          aria-label="排序"
          value={search.order ?? "recent"}
          onChange={(value) => void navigate({ search: { ...search, order: value } })}
          options={[
            { value: "recent", label: "最近优先" },
            { value: "todo", label: "未完成优先" },
          ]}
          style={{ minWidth: 116 }}
        />
      </Flex>

      {examsQuery.isLoading ? (
        <Flex flex={1} align="center" justify="center">
          <Spin />
        </Flex>
      ) : examsQuery.isError ? (
        <Flex flex={1} align="center" justify="center">
          <Typography.Text type="danger">
            试卷加载失败：{examsQuery.error instanceof Error ? examsQuery.error.message : "未知错误"}
          </Typography.Text>
        </Flex>
      ) : sortedPapers.length === 0 ? (
        <Flex flex={1} align="center" justify="center">
          <Typography.Text type="secondary">没有符合条件的试卷</Typography.Text>
        </Flex>
      ) : (
        <div
          style={{
            flex: "1 1 0%",
            minHeight: 0,
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: token.marginMD,
            alignContent: "start",
            paddingBottom: token.paddingLG,
          }}
        >
          {sortedPapers.map((paper) => (
            <PaperCard key={paper.id} paper={paper} onSelect={openPaper} />
          ))}
        </div>
      )}
    </Flex>
  );
}
