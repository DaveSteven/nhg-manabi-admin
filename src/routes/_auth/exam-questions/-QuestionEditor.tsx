import { Button, Flex, Input, Radio, Select, Timeline, Typography, theme } from "antd";
import type { CSSProperties } from "react";
import { History, Save } from "lucide-react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import type { ExamQuestionDetail, ExamQuestionUpdate } from "@/api/examQuestion";
import { ANALYSIS_STATUSES, ANSWER_STATUSES } from "@/api/schemas";

const { Text, Title } = Typography;

interface QuestionEditorProps {
  style?: CSSProperties;
  detail: ExamQuestionDetail;
  draft: ExamQuestionUpdate;
  /** Functional update so async editor events (e.g. Quill's mount-time onChange) can never write stale draft fields. */
  onDraftChange: (update: (prev: ExamQuestionUpdate) => ExamQuestionUpdate) => void;
  onSave: () => void;
  saving: boolean;
}

function documentField(document: Record<string, unknown>, key: string): string {
  const value = document[key];
  if (typeof value === "string") return value;
  if (value == null) return "";
  return JSON.stringify(value);
}

/** Same cleanup as the student app: drop MOJi-specific wrapper tags. */
function cleanHtml(html: string): string {
  return String(html ?? "").replace(/<\/?MOJiTest_URL>/g, "");
}

/** Inline variant: collapse newlines so option text stays on one line. */
function cleanInlineHtml(html: string): string {
  return cleanHtml(html)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]*\n[ \t]*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Renders question/option markup (underline, ruby, …) exactly like the student app. */
function HtmlInline({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: cleanInlineHtml(html) }} />;
}

function HtmlBlock({ html, style }: { html: string; style?: CSSProperties }) {
  return <div style={style} dangerouslySetInnerHTML={{ __html: cleanHtml(html) }} />;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { token } = theme.useToken();
  return (
    <section style={{ marginBottom: token.marginLG }}>
      <Title level={5} style={{ marginTop: 0, marginBottom: token.marginSM }}>
        {title}
      </Title>
      {children}
    </section>
  );
}

/** Toolbar for 解析正文 — the formats the student renderer supports. Kept outside the component so the toolbar doesn't reset on re-render. */
const ANALYSIS_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "link", "clean"],
  ],
};

function LabeledRichText({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { token } = theme.useToken();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: token.marginXXS }}>
      <Text strong style={{ fontSize: token.fontSizeSM }}>
        {label}
      </Text>
      <div className="analysis-quill">
        <ReactQuill theme="snow" value={value} modules={ANALYSIS_MODULES} onChange={onChange} />
      </div>
    </label>
  );
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

export function QuestionEditor({
  style,
  detail,
  draft,
  onDraftChange,
  onSave,
  saving,
}: QuestionEditorProps) {
  const { token } = theme.useToken();
  const document = draft.analysis_document;

  const updateDocument = (key: string, value: string) =>
    onDraftChange((prev) => ({
      ...prev,
      analysis_document: { ...prev.analysis_document, [key]: value },
    }));

  const previewEntries: Array<[string, string, boolean]> = [
    ["题目翻译", draft.translation, false],
    ["解析摘要", documentField(document, "summary"), false],
    ["答案解析", draft.analysis, true],
    ["原文依据", documentField(document, "evidence"), false],
    ["知识点", documentField(document, "knowledge_points"), false],
    ["解题提示", documentField(document, "tips"), false],
  ];
  const previewItems = previewEntries.filter(([, value]) => value.trim().length > 0);

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
      <Flex justify="space-between" align="flex-start" gap={token.marginSM} wrap="wrap">
        <div>
          <Text type="secondary">
            {detail.level} · {detail.category_label}
          </Text>
          <Title level={4} style={{ margin: 0 }}>
            {detail.exam_title} · 第 {detail.order_index} 题
          </Title>
        </div>
        <Button
          type="primary"
          icon={<Save size={token.fontSize} />}
          disabled={draft.correct_option_id == null}
          loading={saving}
          onClick={onSave}
        >
          保存修订
        </Button>
      </Flex>

      <Section title="原题">
        <Flex vertical gap={token.marginLG}>
          {detail.passage ? <HtmlBlock html={detail.passage} /> : null}
          <HtmlBlock html={detail.title} />
          <Radio.Group
            value={draft.correct_option_id}
            onChange={(event) => onDraftChange((prev) => ({ ...prev, correct_option_id: event.target.value }))}
            style={{ display: "flex", flexDirection: "column", gap: token.marginMD }}
          >
            {detail.options.map((option) => {
              const isCorrect = draft.correct_option_id === option.id;
              return (
                <Radio key={option.id} value={option.id} style={{ alignItems: "flex-start" }}>
                  <Flex gap={token.marginXS} align="baseline">
                    <Text type={isCorrect ? "success" : undefined} strong={isCorrect}>
                      {option.source_order}.
                    </Text>
                    <Text strong={isCorrect} style={isCorrect ? { color: token.colorSuccess } : undefined}>
                      <HtmlInline html={option.text} />
                    </Text>
                  </Flex>
                </Radio>
              );
            })}
          </Radio.Group>
        </Flex>
      </Section>

      <Section title="校正内容">
        <Flex vertical gap={token.marginMD}>
          <Flex gap={token.marginMD} wrap="wrap">
            <label style={{ display: "flex", flexDirection: "column", gap: token.marginXXS, minWidth: 200 }}>
              <Text strong style={{ fontSize: token.fontSizeSM }}>
                答案状态
              </Text>
              <Select
                value={draft.answer_status}
                onChange={(value) => onDraftChange((prev) => ({ ...prev, answer_status: value }))}
                options={ANSWER_STATUSES.map((item) => ({ value: item.value, label: item.label }))}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: token.marginXXS, minWidth: 200 }}>
              <Text strong style={{ fontSize: token.fontSizeSM }}>
                解析状态
              </Text>
              <Select
                value={draft.analysis_status}
                onChange={(value) => onDraftChange((prev) => ({ ...prev, analysis_status: value }))}
                options={ANALYSIS_STATUSES.map((item) => ({ value: item.value, label: item.label }))}
              />
            </label>
          </Flex>

          <LabeledArea
            label="题目翻译"
            value={draft.translation}
            rows={4}
            onChange={(value) => onDraftChange((prev) => ({ ...prev, translation: value }))}
          />
          <LabeledRichText
            label="解析正文"
            value={draft.analysis}
            onChange={(value) => onDraftChange((prev) => ({ ...prev, analysis: value }))}
          />

          <Flex gap={token.marginMD} wrap="wrap">
            <div style={{ flex: "1 1 260px" }}>
              <LabeledArea
                label="解析摘要"
                value={documentField(document, "summary")}
                rows={4}
                onChange={(value) => updateDocument("summary", value)}
              />
            </div>
            <div style={{ flex: "1 1 260px" }}>
              <LabeledArea
                label="原文依据"
                value={documentField(document, "evidence")}
                rows={4}
                onChange={(value) => updateDocument("evidence", value)}
              />
            </div>
            <div style={{ flex: "1 1 260px" }}>
              <LabeledArea
                label="知识点"
                value={documentField(document, "knowledge_points")}
                rows={3}
                onChange={(value) => updateDocument("knowledge_points", value)}
              />
            </div>
            <div style={{ flex: "1 1 260px" }}>
              <LabeledArea
                label="解题提示"
                value={documentField(document, "tips")}
                rows={3}
                onChange={(value) => updateDocument("tips", value)}
              />
            </div>
          </Flex>

          <LabeledArea
            label="审核备注"
            value={draft.review_note}
            rows={3}
            placeholder="记录答案来源、修改原因或存疑点；学生不可见"
            onChange={(value) => onDraftChange((prev) => ({ ...prev, review_note: value }))}
          />
        </Flex>
      </Section>

      <Section title="学生端预览">
        {previewItems.length === 0 ? (
          <Text type="secondary">暂无学生端可见内容。</Text>
        ) : (
          <Flex vertical gap={token.marginSM}>
            {previewItems.map(([label, value, isHtml]) => (
              <div key={label}>
                <Text strong style={{ fontSize: token.fontSizeSM }}>
                  {label}
                </Text>
                {isHtml ? (
                  <div className="analysis-preview" style={{ marginTop: token.marginXXS }} dangerouslySetInnerHTML={{ __html: value }} />
                ) : (
                  <p style={{ margin: `${token.marginXXS}px 0 0` }}>{value}</p>
                )}
              </div>
            ))}
          </Flex>
        )}
      </Section>

      <Section title="版本历史">
        {detail.revisions.length === 0 ? (
          <Text type="secondary">尚无修订记录。</Text>
        ) : (
          <Timeline
            items={detail.revisions.map((revision) => {
              const version =
                typeof revision.after.answer_version === "number"
                  ? `v${revision.after.answer_version}`
                  : "—";
              return {
                content: (
                  <Flex vertical>
                    <Text strong>
                      版本 {version} · {new Date(revision.created_at).toLocaleString("zh-CN")}
                    </Text>
                    <Text type="secondary">{revision.note || "无审核备注"}</Text>
                  </Flex>
                ),
              };
            })}
          />
        )}
      </Section>

      <Flex align="center" gap={token.marginXS}>
        <History size={token.fontSize} />
        <Text type="secondary">
          当前版本 v{detail.answer_version} · 保存后会记录到版本历史
        </Text>
      </Flex>
    </Flex>
  );
}
