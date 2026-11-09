import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { App, Flex, Spin, theme, Typography } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod/v4";
import { useEffect, useState } from "react";
import {
  fetchExamQuestionDetail,
  fetchExamQuestionList,
  updateExamQuestion,
} from "@/api/examQuestion";
import { ExamQuestionUpdateSchema } from "@/api/schemas";
import type { ExamQuestionDetail, ExamQuestionUpdate } from "@/api/examQuestion";
import { QuestionFilters } from "./-QuestionFilters";
import { QuestionList } from "./-QuestionList";
import { QuestionEditor } from "./-QuestionEditor";

const ExamQuestionSearchSchema = z.object({
  q: z.string().catch(""),
  level: z.string().catch(""),
  category: z.string().catch(""),
  answer_status: z.string().catch(""),
  analysis_status: z.string().catch(""),
  exam_year: z.string().catch(""),
  exam_month: z.string().catch(""),
  questionId: z.number().int().positive().nullable().catch(null),
  page: z.number().int().positive().catch(1),
  pageSize: z.number().int().positive().catch(30),
});

/** "" → undefined so the query param is omitted entirely. */
function searchNumber(value: string): number | undefined {
  const parsed = Number(value);
  return value !== "" && Number.isInteger(parsed) ? parsed : undefined;
}

export const Route = createFileRoute("/_auth/exam-questions/")({
  validateSearch: (search) => ExamQuestionSearchSchema.parse(search),
  component: ExamQuestionsPage,
});

const MESSAGE_KEY_SAVE = "exam-question-save";

function ExamQuestionsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ExamQuestionUpdate | null>(null);
  const [draftForId, setDraftForId] = useState<number | null>(null);

  const listQuery = useQuery({
    queryKey: [
      "exam-questions",
      "list",
      search.q,
      search.level,
      search.category,
      search.answer_status,
      search.analysis_status,
      search.exam_year,
      search.exam_month,
      search.page,
      search.pageSize,
    ],
    queryFn: () =>
      fetchExamQuestionList({
        q: search.q || undefined,
        level: search.level || undefined,
        category: search.category || undefined,
        answer_status: search.answer_status || undefined,
        analysis_status: search.analysis_status || undefined,
        exam_year: searchNumber(search.exam_year),
        exam_month: searchNumber(search.exam_month),
        page: search.page,
        page_size: search.pageSize,
      }),
  });

  const selectedId = search.questionId;
  const detailQuery = useQuery({
    queryKey: ["exam-questions", "detail", selectedId],
    queryFn: () => fetchExamQuestionDetail(selectedId!),
    enabled: selectedId != null,
  });

  const detail: ExamQuestionDetail | undefined = detailQuery.data;

  /** Re-seed the draft whenever a different question's detail arrives. */
  useEffect(() => {
    /** Skip stale arrivals: the URL may already point at another question. */
    if (!detail || detail.id !== selectedId || draftForId === detail.id) return;
    setDraftForId(detail.id);
    setDraft(
      ExamQuestionUpdateSchema.parse({
        correct_option_id: detail.correct_option_id,
        answer_status: detail.answer_status,
        analysis_status: detail.analysis_status,
        translation: detail.translation,
        analysis: detail.analysis,
        analysis_document: detail.analysis_document,
        review_note: detail.review_note,
      }),
    );
  }, [detail, draftForId]);

  const saveMutation = useMutation({
    mutationFn: (values: ExamQuestionUpdate) => updateExamQuestion(selectedId!, values),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["exam-questions"] });
      setDraft(
        ExamQuestionUpdateSchema.parse({
          correct_option_id: updated.correct_option_id,
          answer_status: updated.answer_status,
          analysis_status: updated.analysis_status,
          translation: updated.translation,
          analysis: updated.analysis,
          analysis_document: updated.analysis_document,
          review_note: updated.review_note,
        }),
      );
      message.success({ content: "已保存，并记录到版本历史。", key: MESSAGE_KEY_SAVE });
    },
    onError: (err) => {
      message.error({
        content: err instanceof Error ? err.message : "保存失败",
        key: MESSAGE_KEY_SAVE,
      });
    },
  });

  const selectQuestion = (id: number) => {
    setDraft(null);
    setDraftForId(null);
    void navigate({ search: { ...search, questionId: id } });
  };

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / search.pageSize));

  return (
    <Flex vertical gap={token.marginMD} style={{ flex: "1 1 0%", minHeight: 0 }}>
      <QuestionFilters
        q={search.q}
        level={search.level}
        category={search.category}
        answerStatus={search.answer_status}
        analysisStatus={search.analysis_status}
        examYear={search.exam_year}
        examMonth={search.exam_month}
        onSearch={(patch) => void navigate({ search: { ...search, ...patch, page: 1 } })}
      />

      <Flex gap={token.marginMD} align="stretch" style={{ flex: "1 1 0%", minHeight: 0 }}>
        <QuestionList
          style={{ width: 380, flexShrink: 0 }}
          items={listQuery.data?.items ?? []}
          total={listQuery.data?.total ?? 0}
          loading={listQuery.isLoading}
          selectedId={selectedId}
          page={search.page}
          pageSize={search.pageSize}
          totalPages={totalPages}
          onSelect={selectQuestion}
          onPageChange={(page) => void navigate({ search: { ...search, page } })}
        />

        {selectedId == null ? (
          <Flex
            flex={1}
            align="center"
            justify="center"
            style={{
              minWidth: 0,
              background: token.colorBgContainer,
              borderRadius: token.borderRadiusLG,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Typography.Text type="secondary">
              选择一道题开始校正；修改会保存版本历史，学生端不会看到审核备注。
            </Typography.Text>
          </Flex>
        ) : detailQuery.isLoading ? (
          <Flex flex={1} align="center" justify="center" style={{ minWidth: 0 }}>
            <Spin />
          </Flex>
        ) : detailQuery.isError ? (
          <Flex
            flex={1}
            align="center"
            justify="center"
            style={{ minWidth: 0, background: token.colorBgContainer, borderRadius: token.borderRadiusLG }}
          >
            <Typography.Text type="danger">
              题目详情加载失败：{detailQuery.error instanceof Error ? detailQuery.error.message : "未知错误"}
            </Typography.Text>
          </Flex>
        ) : detail && draft && draftForId === detail.id ? (
          <QuestionEditor
            key={detail.id}
            style={{ flex: 1, minWidth: 0 }}
            detail={detail}
            draft={draft}
            onDraftChange={(update) => setDraft((prev) => (prev ? update(prev) : prev))}
            onSave={() => saveMutation.mutate(draft)}
            saving={saveMutation.isPending}
          />
        ) : null}
      </Flex>
    </Flex>
  );
}
