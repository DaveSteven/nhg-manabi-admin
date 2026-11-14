import DOMPurify from "dompurify";
import {
  Button,
  Collapse,
  Flex,
  Input,
  Radio,
  Select,
  Tag,
  Timeline,
  Typography,
  theme,
} from "antd";
import type { CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import type { ExamQuestionDetail, ExamQuestionUpdate } from "@/api/examQuestion";
import { ANALYSIS_STATUSES, ANSWER_STATUSES } from "@/api/schemas";
import type { LayerGroup } from "./-PaperQuestionList";
import { formatApiDateTime } from "@/utils/datetime";

const { Text } = Typography;

export type QuestionDraftUpdater = (prev: ExamQuestionUpdate) => ExamQuestionUpdate;

interface LayerWorkbenchProps {
  style?: CSSProperties;
  layerGroup: LayerGroup | null;
  details: ExamQuestionDetail[];
  /** 题组级共享图片（读解图表/听力场景图）。 */
  layerImageUrl: string | null;
  drafts: Record<number, ExamQuestionUpdate>;
  baselines: Record<number, ExamQuestionUpdate>;
  /** 仅用于键盘导航时高亮当前卡片，不影响编辑——所有卡片始终可直接编辑。 */
  selectedId: number | null;
  onDraftChange: (id: number, update: QuestionDraftUpdater) => void;
  onSaveGroup: () => void;
  onSaveAndNext: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  hasNextPending: boolean;
  saving: boolean;
  dirtyCount: number;
}

function documentField(document: Record<string, unknown>, key: string): string {
  const value = document[key];
  if (typeof value === "string") return value;
  if (value == null) return "";
  return JSON.stringify(value);
}

/**
 * Question HTML comes from scraped sources and admin edits, so it must be
 * sanitized before rendering (same DOMPurify profile as the student app).
 */
function cleanHtml(html: string): string {
  return DOMPurify.sanitize(String(html ?? ""), { USE_PROFILES: { html: true } });
}

function cleanInlineHtml(html: string): string {
  return cleanHtml(html)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]*\n[ \t]*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function HtmlInline({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: cleanInlineHtml(html) }} />;
}

function LabeledArea({
  label,
  value,
  rows,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const { token } = theme.useToken();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: token.marginXXS }}>
      <Text strong style={{ fontSize: token.fontSizeSM }}>
        {label}
      </Text>
      <Input.TextArea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

/** 解析正文工具栏；组件外常量避免 Quill 重挂载。 */
const ANALYSIS_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "link", "clean"],
  ],
};

function RichTextArea({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { token } = theme.useToken();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: token.marginXXS }}>
      <Text strong style={{ fontSize: token.fontSizeSM }}>
        {label}
      </Text>
      <div className={`review-quill ${className ?? ""}`}>
        <ReactQuill
          theme="snow"
          value={value}
          modules={ANALYSIS_MODULES}
          onChange={(content, _delta, source) => {
            // Quill 挂载规范化初始 HTML 时会以 source="api" 触发一次 change，
            // 不筛掉会把未编辑的题标记为未保存。
            if (source !== "user") return;
            onChange(content);
          }}
        />
      </div>
    </label>
  );
}

export function LayerWorkbench({
  style,
  layerGroup,
  details,
  layerImageUrl,
  drafts,
  baselines,
  selectedId,
  onDraftChange,
  onSaveGroup,
  onSaveAndNext,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  hasNextPending,
  saving,
  dirtyCount,
}: LayerWorkbenchProps) {
  const { token } = theme.useToken();
  const detailById = new Map(details.map((detail) => [detail.id, detail]));
  const activePassageGroup = layerGroup?.passageGroups.find((group) =>
    group.tiles.some((tile) => tile.id === selectedId),
  );
  const activeTile = activePassageGroup?.tiles.find((tile) => tile.id === selectedId);
  /** 与学生端 .exam-image 相同的尺寸约束。 */
  const imageStyle: CSSProperties = {
    width: "min(100%, 680px)",
    maxHeight: 520,
    objectFit: "contain",
    borderRadius: token.borderRadius,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  };

  return (
    <Flex
      vertical
      gap={token.marginMD}
      style={{
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: token.paddingLG,
        overflowY: "auto",
        ...style,
      }}
    >
      <Flex align="flex-start">
        <div>
          <Text type="secondary">{layerGroup?.problemLabel ?? ""}</Text>
          <Text strong style={{ fontSize: token.fontSizeLG, display: "block" }}>
            問題工作台 · {details.length} 道小题
          </Text>
          {layerGroup?.layerTitle ? <Text type="secondary">{layerGroup.layerTitle}</Text> : null}
        </div>
      </Flex>

      {layerImageUrl ? <img src={layerImageUrl} alt="" style={imageStyle} /> : null}

      <Flex vertical gap={token.marginLG} style={{ paddingBottom: 72 }}>
        {activePassageGroup
          ? [activePassageGroup].map((group, groupIndex) => {
              // 原始翻译完全一致时视为共享译文（長文型的文章翻译会被导入复制到每道小题）：
              // 整组只显示一个输入框，编辑同步写入组内所有小题。
              const baselineTranslations = group.tiles.map(
                (tile) => baselines[tile.id]?.translation ?? "",
              );
              const sharedTranslation =
                group.tiles.length > 1 &&
                baselineTranslations.every((value) => value === baselineTranslations[0])
                  ? group.tiles[0].id
                  : null;

              return (
                <Flex key={`${groupIndex}-${group.tiles[0]?.id}`} vertical gap={token.marginMD}>
                  {group.passage ? (
                    // T-032：题目原文改为富文本编辑（原文即 HTML 存储，与学生端渲染一致）。
                    // 组内小题共享同一篇原文，编辑同步写入全组 draft（与共享译文同模式）。
                    <RichTextArea
                      label="题目原文"
                      value={drafts[group.tiles[0]?.id]?.passage ?? ""}
                      className="passage-quill"
                      onChange={(value) => {
                        for (const tile of group.tiles) {
                          onDraftChange(tile.id, (prev) => ({ ...prev, passage: value }));
                        }
                      }}
                    />
                  ) : null}
                  {sharedTranslation != null ? (
                    <RichTextArea
                      label={`共享译文（影响第 ${group.tiles.map((tile) => tile.displayNumber).join("、")} 题）`}
                      value={drafts[sharedTranslation]?.translation ?? ""}
                      className="translation-quill"
                      onChange={(value) => {
                        for (const tile of group.tiles) {
                          onDraftChange(tile.id, (prev) => ({ ...prev, translation: value }));
                        }
                      }}
                    />
                  ) : null}
                  {activeTile ? renderCard(activeTile, sharedTranslation != null) : null}
                </Flex>
              );
            })
          : null}
      </Flex>

      <Flex
        justify="space-between"
        align="center"
        gap={token.marginSM}
        wrap="wrap"
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 2,
          margin: `0 -${token.paddingLG}px -${token.paddingLG}px`,
          padding: `${token.paddingSM}px ${token.paddingLG}px`,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          boxShadow: "0 -6px 18px rgba(0, 0, 0, 0.06)",
        }}
      >
        <Flex gap={token.marginXS}>
          <Button
            icon={<ArrowLeft size={token.fontSize} />}
            disabled={!hasPrevious || saving}
            onClick={onPrevious}
          >
            上一题
          </Button>
          <Button disabled={!hasNext || saving} onClick={onNext}>
            下一题
          </Button>
        </Flex>
        <Flex gap={token.marginXS} align="center">
          {dirtyCount > 0 ? (
            <Text type="warning">{dirtyCount} 题未保存</Text>
          ) : (
            <Text type="success">已保存</Text>
          )}
          <Button
            icon={<Save size={token.fontSize} />}
            disabled={dirtyCount === 0}
            loading={saving}
            onClick={onSaveGroup}
          >
            保存
          </Button>
          <Button
            type="primary"
            icon={<ArrowRight size={token.fontSize} />}
            disabled={dirtyCount === 0 || !hasNextPending}
            loading={saving}
            onClick={onSaveAndNext}
          >
            保存并前往下一道待处理
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );

  function renderCard(
    tile: LayerGroup["passageGroups"][number]["tiles"][number],
    hideTranslation: boolean,
  ) {
    {
      const detail = detailById.get(tile.id);
      const draft = drafts[tile.id];
      if (!detail || !draft) return null;
      const active = tile.id === selectedId;
      const dirty = JSON.stringify(draft) !== JSON.stringify(baselines[tile.id]);
      const doc = draft.analysis_document;

      const updateDocument = (key: string, value: string) =>
        onDraftChange(tile.id, (prev) => ({
          ...prev,
          analysis_document: { ...prev.analysis_document, [key]: value },
        }));

      return (
        <div
          key={tile.id}
          id={`workbench-card-${tile.id}`}
          style={{
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${active ? token.colorPrimary : token.colorBorderSecondary}`,
            background: token.colorBgContainer,
            padding: token.paddingMD,
          }}
        >
          <Flex justify="space-between" align="center" gap={token.marginSM} wrap="wrap">
            <Flex gap={token.marginXXS} align="center">
              <Tag color="default" style={{ marginInlineEnd: 0 }}>
                第 {tile.displayNumber} 题
              </Tag>
              {dirty ? (
                <Tag color="warning" style={{ marginInlineEnd: 0 }}>
                  未保存
                </Tag>
              ) : null}
            </Flex>
            <Flex gap={token.marginSM} wrap="wrap">
              <label style={{ display: "flex", alignItems: "center", gap: token.marginXXS }}>
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  答案状态
                </Text>
                <Select
                  size="small"
                  value={draft.answer_status}
                  onChange={(value) =>
                    onDraftChange(tile.id, (prev) => ({ ...prev, answer_status: value }))
                  }
                  options={ANSWER_STATUSES.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  style={{ minWidth: 110 }}
                />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: token.marginXXS }}>
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  解析状态
                </Text>
                <Select
                  size="small"
                  value={draft.analysis_status}
                  onChange={(value) =>
                    onDraftChange(tile.id, (prev) => ({ ...prev, analysis_status: value }))
                  }
                  options={ANALYSIS_STATUSES.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  style={{ minWidth: 110 }}
                />
              </label>
            </Flex>
          </Flex>

          <div style={{ marginTop: token.marginSM }}>
            <HtmlInline html={tile.title} />
          </div>

          {detail.media_url ? (
            <audio
              controls
              preload="none"
              src={detail.media_url}
              style={{ width: "100%", marginTop: token.marginSM }}
            />
          ) : null}
          {detail.category === "listening" ? (
            <div style={{ marginTop: token.marginMD }}>
              <RichTextArea
                label="听力原文"
                value={draft.subtitle}
                className="transcript-quill"
                onChange={(value) =>
                  onDraftChange(tile.id, (prev) => ({ ...prev, subtitle: value }))
                }
              />
            </div>
          ) : null}
          {detail.image_url ? (
            <img
              src={detail.image_url}
              alt=""
              style={{ ...imageStyle, marginTop: token.marginSM }}
            />
          ) : null}

          <Radio.Group
            value={draft.correct_option_id}
            onChange={(event) =>
              onDraftChange(tile.id, (prev) => ({ ...prev, correct_option_id: event.target.value }))
            }
            style={{
              display: "flex",
              flexDirection: "column",
              gap: token.marginSM,
              marginTop: token.marginMD,
            }}
          >
            {detail.options.map((option) => {
              const isCorrect = draft.correct_option_id === option.id;
              return (
                <Radio key={option.id} value={option.id} style={{ alignItems: "flex-start" }}>
                  <Flex gap={token.marginXS} align="baseline">
                    <Text type={isCorrect ? "success" : undefined} strong={isCorrect}>
                      {option.source_order}.
                    </Text>
                    <Text
                      strong={isCorrect}
                      style={isCorrect ? { color: token.colorSuccess } : undefined}
                    >
                      <HtmlInline html={option.text} />
                    </Text>
                  </Flex>
                </Radio>
              );
            })}
          </Radio.Group>

          <Flex vertical gap={token.marginMD} style={{ marginTop: token.marginMD }}>
            {hideTranslation ? null : (
              <RichTextArea
                label="题目翻译"
                value={draft.translation}
                className="translation-quill"
                onChange={(value) =>
                  onDraftChange(tile.id, (prev) => ({ ...prev, translation: value }))
                }
              />
            )}
            <label style={{ display: "flex", flexDirection: "column", gap: token.marginXXS }}>
              <Text strong style={{ fontSize: token.fontSizeSM }}>
                解析正文
              </Text>
              <div className="review-quill analysis-quill">
                <ReactQuill
                  theme="snow"
                  value={draft.analysis}
                  modules={ANALYSIS_MODULES}
                  onChange={(value, _delta, source) => {
                    if (source !== "user") return;
                    onDraftChange(tile.id, (prev) => ({ ...prev, analysis: value }));
                  }}
                />
              </div>
            </label>
          </Flex>

          <Collapse
            ghost
            size="small"
            items={[
              {
                key: "more",
                label: (
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    更多信息（审核备注 / 解析文档 / 版本历史）
                  </Text>
                ),
                styles: { body: { paddingInlineStart: 0 } },
                children: (
                  <Flex vertical gap={token.marginMD}>
                    <LabeledArea
                      label="审核备注"
                      value={draft.review_note}
                      rows={2}
                      placeholder="记录答案来源、修改原因或存疑点；学生不可见"
                      onChange={(value) =>
                        onDraftChange(tile.id, (prev) => ({ ...prev, review_note: value }))
                      }
                    />
                    <LabeledArea
                      label="解析摘要"
                      value={documentField(doc, "summary")}
                      rows={2}
                      onChange={(value) => updateDocument("summary", value)}
                    />
                    <LabeledArea
                      label="原文依据"
                      value={documentField(doc, "evidence")}
                      rows={2}
                      onChange={(value) => updateDocument("evidence", value)}
                    />
                    <LabeledArea
                      label="知识点"
                      value={documentField(doc, "knowledge_points")}
                      rows={2}
                      onChange={(value) => updateDocument("knowledge_points", value)}
                    />
                    <LabeledArea
                      label="解题提示"
                      value={documentField(doc, "tips")}
                      rows={2}
                      onChange={(value) => updateDocument("tips", value)}
                    />
                    {detail.revisions.length > 0 ? (
                      <div>
                        <Text strong style={{ fontSize: token.fontSizeSM }}>
                          版本历史 · 当前 v{detail.answer_version}
                        </Text>
                        <Timeline
                          style={{ marginTop: token.marginSM }}
                          items={detail.revisions.map((revision) => ({
                            content: (
                              <Flex vertical>
                                <Text strong style={{ fontSize: token.fontSizeSM }}>
                                  {typeof revision.after.answer_version === "number"
                                    ? `v${revision.after.answer_version}`
                                    : "—"}{" "}
                                  · {formatApiDateTime(revision.created_at)}
                                </Text>
                                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                  {revision.note || "无审核备注"}
                                </Text>
                              </Flex>
                            ),
                          }))}
                        />
                      </div>
                    ) : null}
                  </Flex>
                ),
              },
            ]}
          />
        </div>
      );
    }
  }
}
