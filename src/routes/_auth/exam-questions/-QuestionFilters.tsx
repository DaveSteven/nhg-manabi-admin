import { Button, Flex, Input, Select, theme } from "antd";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  ANALYSIS_STATUSES,
  ANSWER_STATUSES,
  EXAM_CATEGORIES,
  EXAM_LEVELS,
} from "@/api/schemas";

export interface QuestionFiltersValue {
  q: string;
  level: string;
  category: string;
  answer_status: string;
  analysis_status: string;
}

interface QuestionFiltersProps {
  q: string;
  level: string;
  category: string;
  answerStatus: string;
  analysisStatus: string;
  onSearch: (patch: Partial<QuestionFiltersValue>) => void;
}

export function QuestionFilters({
  q,
  level,
  category,
  answerStatus,
  analysisStatus,
  onSearch,
}: QuestionFiltersProps) {
  const { token } = theme.useToken();
  const [keyword, setKeyword] = useState(q);

  useEffect(() => {
    setKeyword(q);
  }, [q]);

  const selectStyle = { minWidth: 116 };

  return (
    <Flex
      component="form"
      gap={token.marginSM}
      wrap="wrap"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch({ q: keyword.trim() });
      }}
    >
      <Input
        allowClear
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="搜索题干或选项"
        prefix={<Search size={token.fontSize} />}
        style={{ width: 220 }}
      />
      <Select
        aria-label="等级"
        value={level}
        onChange={(value) => onSearch({ level: value })}
        options={[{ value: "", label: "全部等级" }, ...EXAM_LEVELS.map((v) => ({ value: v, label: v }))]}
        style={selectStyle}
      />
      <Select
        aria-label="分类"
        value={category}
        onChange={(value) => onSearch({ category: value })}
        options={EXAM_CATEGORIES.map((item) => ({ value: item.value, label: item.label }))}
        style={selectStyle}
      />
      <Select
        aria-label="答案状态"
        value={answerStatus}
        onChange={(value) => onSearch({ answer_status: value })}
        options={[
          { value: "", label: "全部答案状态" },
          ...ANSWER_STATUSES.map((item) => ({ value: item.value, label: item.label })),
        ]}
        style={selectStyle}
      />
      <Select
        aria-label="解析状态"
        value={analysisStatus}
        onChange={(value) => onSearch({ analysis_status: value })}
        options={[
          { value: "", label: "全部解析状态" },
          ...ANALYSIS_STATUSES.map((item) => ({ value: item.value, label: item.label })),
        ]}
        style={selectStyle}
      />
      <Button type="primary" htmlType="submit">
        筛选
      </Button>
    </Flex>
  );
}
