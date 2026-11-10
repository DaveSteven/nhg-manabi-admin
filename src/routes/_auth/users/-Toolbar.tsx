import { Button, Input, Select, theme } from "antd";
import { Plus, UserRound } from "lucide-react";
import { forwardRef, useMemo } from "react";
import { FilterToolbar } from "@/components/FilterToolbar";

/** Search + role slot `minWidth` for FilterToolbar collapse math */
const FILTER_CONTROL_WIDTH = 220;

export type ToolbarProps = {
  keywordInput: string;
  onKeywordChange: (value: string) => void;
  onSearch: (keyword: string) => void;
  onClearSearch: () => void;
  roleValue: string | undefined;
  onRoleChange: (role: string) => void;
  onCreateClick: () => void;
};

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(function Toolbar(
  {
    keywordInput,
    onKeywordChange,
    onSearch,
    onClearSearch,
    roleValue,
    onRoleChange,
    onCreateClick,
  },
  ref,
) {
  const { token } = theme.useToken();

  const slots = useMemo(
    () => [
      {
        key: "keyword",
        minWidth: FILTER_CONTROL_WIDTH,
        children: (
          <Input.Search
            allowClear
            placeholder="搜索用户名或昵称"
            style={{ width: FILTER_CONTROL_WIDTH }}
            value={keywordInput}
            onChange={(e) => onKeywordChange(e.target.value)}
            onSearch={(v) => onSearch(v)}
            onClear={onClearSearch}
          />
        ),
      },
      {
        key: "role",
        minWidth: FILTER_CONTROL_WIDTH,
        children: (
          <Select
            allowClear
            placeholder="角色"
            style={{ width: FILTER_CONTROL_WIDTH }}
            prefix={<UserRound size={token.fontSize} />}
            value={roleValue}
            onChange={(v) => onRoleChange(v ?? "")}
            options={[
              { label: "管理员", value: "admin" },
              { label: "用户", value: "user" },
            ]}
          />
        ),
      },
    ],
    [
      keywordInput,
      onClearSearch,
      onKeywordChange,
      onRoleChange,
      onSearch,
      roleValue,
      token.fontSize,
    ],
  );

  return (
    <FilterToolbar
      ref={ref}
      slots={slots}
      actions={
        <Button type="primary" icon={<Plus size={token.fontSize} />} onClick={onCreateClick}>
          新建用户
        </Button>
      }
      moreFiltersLabel="更多筛选"
      moreFiltersTitle="更多筛选"
    />
  );
});
