import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { App, Button, Flex, Spin, Typography, theme } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Crosshair } from "lucide-react";
import { z } from "zod/v4";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchExamLayerQuestions,
  fetchExamQuestionList,
  updateExamQuestion,
} from "@/api/examQuestion";
import { ExamQuestionUpdateSchema } from "@/api/schemas";
import type { ExamQuestionDetail, ExamQuestionUpdate } from "@/api/examQuestion";
import { PaperQuestionList, buildLayerGroup, countReviewProgress, groupByCategory, questionReviewStatus } from "./-PaperQuestionList";
import { LayerWorkbench } from "./-LayerWorkbench";

const PaperSearchSchema = z.object({
  questionId: z.number().int().positive().optional().catch(undefined),
});

export const Route = createFileRoute("/_auth/exam-questions/$examId")({
  validateSearch: (search) => PaperSearchSchema.parse(search),
  component: PaperRevisionPage,
});

const MESSAGE_KEY_SAVE = "exam-question-save";
/** 题目较多时避免一次渲染过长，仍以一页容纳整份试卷。 */
const PAPER_PAGE_SIZE = 300;

interface WorkbenchState {
  layerId: number;
  drafts: Record<number, ExamQuestionUpdate>;
  baselines: Record<number, ExamQuestionUpdate>;
}

function seedDraft(detail: ExamQuestionDetail): ExamQuestionUpdate {
  return ExamQuestionUpdateSchema.parse({
    correct_option_id: detail.correct_option_id,
    answer_status: detail.answer_status,
    analysis_status: detail.analysis_status,
    subtitle: detail.subtitle,
    translation: detail.translation,
    analysis: detail.analysis,
    analysis_document: detail.analysis_document,
    review_note: detail.review_note,
  });
}

function PaperRevisionPage() {
  const { examId } = Route.useParams();
  const paperId = Number(examId);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const [workbench, setWorkbench] = useState<WorkbenchState | null>(null);

  const listQuery = useQuery({
    queryKey: ["exam-questions", "paper", paperId],
    queryFn: () => fetchExamQuestionList({ exam_id: paperId, page_size: PAPER_PAGE_SIZE }),
  });
  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);
  const sections = useMemo(() => groupByCategory(items), [items]);
  const examTitle = items[0]?.exam_title ?? `试卷 #${paperId}`;

  const { answerDone, analysisDone, disputed } = countReviewProgress(items);
  const total = items.length;

  const selectedId = search.questionId ?? null;
  const selectedLayerId = useMemo(
    () => items.find((item) => item.id === selectedId)?.layer_id ?? null,
    [items, selectedId],
  );

  /** 問題工作台数据：整組小题的完整修订数据。 */
  const layerQuery = useQuery({
    queryKey: ["exam-questions", "layer", selectedLayerId],
    queryFn: () => fetchExamLayerQuestions(selectedLayerId!),
    enabled: selectedLayerId != null,
  });
  const layerDetails = useMemo(() => layerQuery.data?.items ?? [], [layerQuery.data]);
  const layerImageUrl = layerQuery.data?.layer_image_url ?? null;
  const layerGroup = useMemo(
    () => (selectedLayerId != null ? buildLayerGroup(items, selectedLayerId) : null),
    [items, selectedLayerId],
  );

  /** 整組草稿播种：只在切换到不同題組时重置。 */
  useEffect(() => {
    if (layerDetails.length === 0 || selectedLayerId == null) return;
    if (workbench?.layerId === selectedLayerId) return;
    const drafts: Record<number, ExamQuestionUpdate> = {};
    const baselines: Record<number, ExamQuestionUpdate> = {};
    for (const detail of layerDetails) {
      drafts[detail.id] = seedDraft(detail);
      baselines[detail.id] = seedDraft(detail);
    }
    setWorkbench({ layerId: selectedLayerId, drafts, baselines });
  }, [layerDetails, selectedLayerId, workbench]);

  const dirtyCount = workbench
    ? Object.keys(workbench.drafts).filter(
        (id) => JSON.stringify(workbench.drafts[Number(id)]) !== JSON.stringify(workbench.baselines[Number(id)]),
      ).length
    : 0;

  const saveGroupMutation = useMutation({
    mutationFn: async () => {
      if (!workbench) return null;
      const changed = Object.keys(workbench.drafts)
        .map(Number)
        .filter((id) => JSON.stringify(workbench.drafts[id]) !== JSON.stringify(workbench.baselines[id]));
      const results: Array<{ id: number; updated: ExamQuestionDetail }> = [];
      const failed: number[] = [];
      for (const id of changed) {
        try {
          const updated = await updateExamQuestion(id, workbench.drafts[id]);
          results.push({ id, updated });
        } catch {
          failed.push(id);
        }
      }
      return { changed, results, failed };
    },
    onSuccess: (result) => {
      if (!result) return;
      void queryClient.invalidateQueries({ queryKey: ["exam-questions"] });
      setWorkbench((wb) => {
        if (!wb) return wb;
        const drafts = { ...wb.drafts };
        const baselines = { ...wb.baselines };
        for (const { id, updated } of result.results) {
          const parsed = seedDraft(updated);
          drafts[id] = parsed;
          baselines[id] = parsed;
        }
        return { ...wb, drafts, baselines };
      });
      const total = result.changed.length;
      const failedNums = result.failed
        .map((id) => items.find((item) => item.id === id)?.order_index ?? id)
        .join("、");
      if (result.failed.length === 0) {
        message.success({
          content: total > 0 ? `已保存 ${total} 道小题，并记录到版本历史。` : "没有需要保存的修改。",
          key: MESSAGE_KEY_SAVE,
        });
      } else {
        message.warning({
          content: `保存完成：成功 ${total - result.failed.length} 道，失败 ${result.failed.length} 道（第 ${failedNums} 题），请重试。`,
          key: MESSAGE_KEY_SAVE,
          duration: 6,
        });
      }
    },
    onError: (err) => {
      message.error({
        content: err instanceof Error ? err.message : "保存失败",
        key: MESSAGE_KEY_SAVE,
      });
    },
  });

  const selectQuestion = useCallback(
    (id: number) => {
      const targetLayer = items.find((item) => item.id === id)?.layer_id;
      if (dirtyCount > 0 && targetLayer !== selectedLayerId) {
        if (!window.confirm(`当前問題有 ${dirtyCount} 道小题未保存，确定放弃并离开？`)) return;
        setWorkbench(null);
      }
      void navigate({ search: { questionId: id } });
    },
    [items, dirtyCount, selectedLayerId, navigate],
  );

  const currentIndex = items.findIndex((item) => item.id === selectedId);

  const goToNeighbor = useCallback(
    (offset: number) => {
      const nextIndex = currentIndex + offset;
      if (nextIndex < 0 || nextIndex >= items.length) return;
      selectQuestion(items[nextIndex].id);
    },
    [currentIndex, items, selectQuestion],
  );

  /** 键盘 ←/→（J/K 亦可）切换小题；输入框、下拉和富文本编辑时不响应。 */
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft" || event.key === "j") goToNeighbor(-1);
      if (event.key === "ArrowRight" || event.key === "k") goToNeighbor(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goToNeighbor]);

  const jumpToFirstPending = () => {
    const firstPending = items.find((item) => questionReviewStatus(item) !== "done");
    if (firstPending) {
      selectQuestion(firstPending.id);
    } else {
      message.info("这份试卷已全部完成。");
    }
  };

  const nextQuestionId = useMemo(() => {
    if (items.length === 0) return null;
    const start = Math.max(currentIndex, -1);
    for (let offset = 1; offset <= items.length; offset += 1) {
      const candidate = items[(start + offset) % items.length];
      if (candidate.id !== selectedId && questionReviewStatus(candidate) !== "done") return candidate.id;
    }
    const immediateNext = items[currentIndex + 1];
    return immediateNext?.id ?? null;
  }, [currentIndex, items, selectedId]);

  const saveAndGoNext = useCallback(async () => {
    const result = await saveGroupMutation.mutateAsync();
    if (!result || result.failed.length > 0 || nextQuestionId == null) return;
    void navigate({ search: { questionId: nextQuestionId } });
  }, [navigate, nextQuestionId, saveGroupMutation]);

  const handleDraftChange = useCallback(
    (id: number, update: (prev: ExamQuestionUpdate) => ExamQuestionUpdate) => {
      setWorkbench((wb) => (wb ? { ...wb, drafts: { ...wb.drafts, [id]: update(wb.drafts[id]) } } : wb));
    },
    [],
  );

  return (
    <Flex vertical gap={token.marginMD} style={{ flex: "1 1 0%", minHeight: 0 }}>
      <Flex
        gap={token.marginMD}
        align="center"
        wrap="wrap"
        style={{
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          padding: `${token.paddingXS}px ${token.paddingSM}px`,
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeft size={token.fontSize} />}
          onClick={() => {
            if (dirtyCount > 0 && !window.confirm(`当前問題有 ${dirtyCount} 道小题未保存，确定放弃并离开？`)) return;
            setWorkbench(null);
            void navigate({ to: "/exam-questions" });
          }}
        >
          返回
        </Button>
        <Typography.Text strong style={{ fontSize: token.fontSizeLG }}>
          {examTitle}
        </Typography.Text>
        <Typography.Text type="secondary">
          答案 {answerDone}/{total} · 解析 {analysisDone}/{total}
          {disputed > 0 ? (
            <Typography.Text type="warning"> · 存疑 {disputed}</Typography.Text>
          ) : null}
        </Typography.Text>
        <Flex flex={1} justify="flex-end" align="center" gap={token.marginSM}>
          {dirtyCount > 0 ? (
            <Typography.Text type="warning" style={{ fontSize: token.fontSizeSM }}>
              {dirtyCount} 题未保存
            </Typography.Text>
          ) : null}
          <Button icon={<Crosshair size={token.fontSize} />} onClick={jumpToFirstPending}>
            定位到第一道未完成
          </Button>
        </Flex>
      </Flex>

      <Flex gap={token.marginMD} align="stretch" style={{ flex: "1 1 0%", minHeight: 0 }}>
        <PaperQuestionList
          style={{ width: 320, flexShrink: 0 }}
          sections={sections}
          total={total}
          loading={listQuery.isLoading}
          selectedId={selectedId}
          onSelect={selectQuestion}
        />

        {selectedId == null ? (
          <Flex
            flex={1}
            vertical
            gap={token.marginSM}
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
              从左侧选择一道小题开始校对；工作台会整組加载该題的所有小题，←/→ 键可快速切换。
            </Typography.Text>
            <Button onClick={jumpToFirstPending}>定位到第一道未完成</Button>
          </Flex>
        ) : listQuery.isLoading || layerQuery.isLoading ? (
          <Flex flex={1} align="center" justify="center" style={{ minWidth: 0 }}>
            <Spin />
          </Flex>
        ) : layerQuery.isError ? (
          <Flex
            flex={1}
            align="center"
            justify="center"
            style={{ minWidth: 0, background: token.colorBgContainer, borderRadius: token.borderRadiusLG }}
          >
            <Typography.Text type="danger">
              題組加载失败：{layerQuery.error instanceof Error ? layerQuery.error.message : "未知错误"}
            </Typography.Text>
          </Flex>
        ) : layerDetails.length > 0 && workbench?.layerId === selectedLayerId && layerGroup ? (
          <LayerWorkbench
            style={{ flex: 1, minWidth: 0 }}
            layerGroup={layerGroup}
            details={layerDetails}
            layerImageUrl={layerImageUrl}
            drafts={workbench.drafts}
            baselines={workbench.baselines}
            selectedId={selectedId}
            onDraftChange={handleDraftChange}
            onSaveGroup={() => saveGroupMutation.mutate()}
            onSaveAndNext={() => void saveAndGoNext()}
            onPrevious={() => goToNeighbor(-1)}
            onNext={() => goToNeighbor(1)}
            hasPrevious={currentIndex > 0}
            hasNext={currentIndex >= 0 && currentIndex < items.length - 1}
            hasNextPending={nextQuestionId != null}
            saving={saveGroupMutation.isPending}
            dirtyCount={dirtyCount}
          />
        ) : null}
      </Flex>
    </Flex>
  );
}
