import { Flex, Pagination, Spin, Tag, Typography, theme } from "antd";
import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { ANSWER_STATUSES } from "@/api/schemas";
import type { ExamQuestionListItem } from "@/api/schemas";

const { Text } = Typography;

interface QuestionListProps {
  style?: CSSProperties;
  items: ExamQuestionListItem[];
  total: number;
  loading: boolean;
  selectedId: number | null;
  page: number;
  pageSize: number;
  totalPages: number;
  onSelect: (id: number) => void;
  onPageChange: (page: number) => void;
}

function answerStatusLabel(value: string): string {
  return ANSWER_STATUSES.find((item) => item.value === value)?.label ?? value;
}

/** Decode HTML entities and strip tags from source markup (same as the student app). */
export function plainText(value: string): string {
  const decoder = document.createElement("textarea");
  decoder.innerHTML = String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decoder.value.replace(/ /g, " ").trim();
}

export function QuestionList({
  style,
  items,
  total,
  loading,
  selectedId,
  page,
  pageSize,
  totalPages,
  onSelect,
  onPageChange,
}: QuestionListProps) {
  const { token } = theme.useToken();

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
      <Flex justify="space-between" align="center">
        <Text strong>{total} 道题</Text>
        <Text type="secondary">
          {page} / {totalPages}
        </Text>
      </Flex>

      <Flex vertical gap={token.marginXS} style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto" }}>
        {loading ? (
          <Flex align="center" justify="center" style={{ padding: token.paddingLG }}>
            <Spin />
          </Flex>
        ) : items.length === 0 ? (
          <Typography.Text type="secondary" style={{ textAlign: "center", padding: token.paddingLG }}>
            没有符合条件的题目
          </Typography.Text>
        ) : (
          items.map((item) => {
            const selected = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: token.marginXS,
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: token.borderRadius,
                  padding: token.paddingSM,
                  border: `1px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
                  background: selected ? token.colorPrimaryBg : token.colorBgContainer,
                  color: token.colorText,
                  font: "inherit",
                  transition: "border-color 0.2s",
                }}
              >
                <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
                  <Flex gap={token.marginXXS} wrap="wrap">
                    <Tag style={{ marginInlineEnd: 0 }}>{item.level}</Tag>
                    <Tag style={{ marginInlineEnd: 0 }}>{item.category_label}</Tag>
                    <Tag color={selected ? "processing" : "default"} style={{ marginInlineEnd: 0 }}>
                      {answerStatusLabel(item.answer_status)}
                    </Tag>
                  </Flex>
                  <Text strong ellipsis>
                    {item.exam_title} · 第 {item.order_index} 题
                  </Text>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    {plainText(item.title || item.passage).slice(0, 110) || "（无文字题干）"}
                  </Text>
                </Flex>
                <ChevronRight size={token.fontSizeLG} style={{ flexShrink: 0, marginTop: 4 }} />
              </button>
            );
          })
        )}
      </Flex>

      <Pagination
        size="small"
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        onChange={onPageChange}
        style={{ alignSelf: "center" }}
      />
    </Flex>
  );
}
