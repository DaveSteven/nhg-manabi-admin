import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Avatar, Button, Form, App, Dropdown, theme, Flex, Tooltip, Typography } from "antd";

const { Text } = Typography;
import type { TablePaginationConfig } from "antd/es/table/interface";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { httpClient } from "@/utils/http";
import { formatApiDateTime, parseApiDate } from "@/utils/datetime";
import { USER_ENDPOINTS } from "@/api/user";
import { PaginatedResponseSchema, UserSchema, CreateUserRequestSchema } from "@/api/schemas";
import type { User, CreateUserRequest, UpdateUserRequest } from "@/api/schemas";
import { z } from "zod/v4";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { DataTable } from "@/components/DataTable";
import { useResourceCRUD } from "@/hooks/useResourceCRUD";
import { Toolbar } from "./-Toolbar";
import { FormModal } from "./-FormModal";

const UserSearchParamsSchema = z.object({
  limit: z.number().int().positive().catch(100),
  offset: z.number().int().nonnegative().catch(0),
  sortField: z.string().nullable().catch(null),
  sortOrder: z.enum(["ascend", "descend"]).nullable().catch(null),
  keyword: z.string().catch(""),
});

export const Route = createFileRoute("/_auth/users/")({
  validateSearch: (search) => UserSearchParamsSchema.parse(search),
  component: UsersPage,
});

const paginatedUserSchema = PaginatedResponseSchema(UserSchema);

const MESSAGE_KEY_USER_CREATE = "user-mutation-create";
const MESSAGE_KEY_USER_UPDATE = "user-mutation-update";
const MESSAGE_KEY_USER_DELETE = "user-mutation-delete";

function UsersPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const [modalOpen, setModalOpen] = useState(false);
  const pageShellRef = useRef<HTMLDivElement>(null);
  const toolbarRowRef = useRef<HTMLDivElement>(null);
  const middleSectionRef = useRef<HTMLDivElement>(null);
  const tableFrameRef = useRef<HTMLDivElement>(null);
  const tableAvailableRef = useRef(0);
  /**
   * If both start as undefined on the first frame, the table grows to full row height (flex min-height:auto)
   * and the main content area scrolls. Seed from the viewport; useLayoutEffect then refines (e.g. available≈901, bodyMax≈861).
   */
  const [tableAreaMaxHeight, setTableAreaMaxHeight] = useState<number | undefined>(() =>
    typeof window !== "undefined" ? Math.max(240, Math.floor(window.innerHeight - 280)) : undefined,
  );
  const [tableScrollY, setTableScrollY] = useState<number | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const maxH = Math.max(240, Math.floor(window.innerHeight - 280));
    return Math.max(120, maxH - 40);
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [keywordInput, setKeywordInput] = useState(search.keyword);
  const currentPage = Math.floor(search.offset / search.limit) + 1;

  useEffect(() => {
    setKeywordInput(search.keyword);
  }, [search.keyword]);

  const { data, isLoading, createMutation, updateMutation, deleteMutation } = useResourceCRUD<
    { list: User[]; total: number },
    CreateUserRequest,
    UpdateUserRequest & { id: number }
  >({
    queryKey: [
      "users",
      search.limit,
      search.offset,
      search.keyword,
      search.sortField,
      search.sortOrder,
    ],
    invalidateKey: ["users"],
    queryFn: () =>
      httpClient.get(USER_ENDPOINTS.list, {
        params: {
          limit: search.limit,
          offset: search.offset,
          keyword: search.keyword || undefined,
          sortField: search.sortField ?? undefined,
          sortOrder: search.sortOrder ?? undefined,
        },
      }),
    select: (raw) => paginatedUserSchema.shape.data.parse(raw),
    createFn: (values) =>
      httpClient.post(USER_ENDPOINTS.create, CreateUserRequestSchema.parse(values)),
    updateFn: ({ id, ...values }) => httpClient.put(USER_ENDPOINTS.update(id), values),
    deleteFn: (id) => httpClient.delete(USER_ENDPOINTS.delete(id)),
    createLifecycle: {
      onSuccess: () => {
        message.success({
          content: "创建成功",
          key: MESSAGE_KEY_USER_CREATE,
        });
        setModalOpen(false);
        form.resetFields();
      },
      onError: () => {
        message.error({
          content: "创建失败",
          key: MESSAGE_KEY_USER_CREATE,
        });
      },
    },
    updateLifecycle: {
      onMutate: () => {
        message.loading({
          content: "Updating…",
          key: MESSAGE_KEY_USER_UPDATE,
          duration: 0,
        });
      },
      onSuccess: () => {
        message.success({
          content: "更新成功",
          key: MESSAGE_KEY_USER_UPDATE,
        });
        setModalOpen(false);
        setEditingUser(null);
        form.resetFields();
      },
      onError: () => {
        message.error({
          content: "更新失败",
          key: MESSAGE_KEY_USER_UPDATE,
        });
      },
    },
    deleteLifecycle: {
      onMutate: () => {
        message.loading({
          content: "删除中…",
          key: MESSAGE_KEY_USER_DELETE,
          duration: 0,
        });
      },
      onSuccess: () => {
        message.success({
          content: "删除成功",
          key: MESSAGE_KEY_USER_DELETE,
        });
      },
      onError: () => {
        message.error({
          content: "删除失败",
          key: MESSAGE_KEY_USER_DELETE,
        });
      },
    },
  });

  const confirmDelete = (record: User) => {
    modal.confirm({
      title: "确认删除该用户？",
      content: "此操作不可撤销，将永久删除该用户账号。",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: true,
      sortOrder: search.sortField === "id" ? search.sortOrder : null,
      width: 70,
    },
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
      sorter: true,
      sortOrder: search.sortField === "username" ? search.sortOrder : null,
      render: (_: unknown, record: User) => (
        <Flex align="center" gap={token.marginSM} style={{ minWidth: 0 }}>
          <Avatar size={24} shape="circle" style={{ flexShrink: 0 }}>
            {record.username?.[0]?.toUpperCase()}
          </Avatar>
          <Typography.Link
            ellipsis
            onClick={() =>
              void navigate({
                to: "/users/$userId",
                params: { userId: String(record.id) },
                search: {},
              })
            }
          >
            {record.username}
          </Typography.Link>
        </Flex>
      ),
    },
    {
      title: "昵称",
      dataIndex: "display_name",
      key: "display_name",
      sorter: true,
      sortOrder: search.sortField === "display_name" ? search.sortOrder : null,
    },
    {
      title: "级别",
      dataIndex: "current_level",
      key: "current_level",
      sorter: true,
      sortOrder: search.sortField === "current_level" ? search.sortOrder : null,
      width: 90,
    },
    {
      title: "注册时间",
      dataIndex: "created_at",
      key: "created_at",
      sorter: true,
      sortOrder: search.sortField === "created_at" ? search.sortOrder : null,
      width: 170,
      render: (value: string) => formatApiDateTime(value),
    },
    {
      title: "最近活跃",
      dataIndex: "last_active_at",
      key: "last_active_at",
      sorter: true,
      sortOrder: search.sortField === "last_active_at" ? search.sortOrder : null,
      width: 120,
      render: (value: string | null) => {
        if (!value) return <Text type="secondary">从未</Text>;
        const date = parseApiDate(value);
        const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
        const label =
          days < 1
            ? "今天"
            : days === 1
              ? "昨天"
              : days < 30
                ? `${days} 天前`
                : `${Math.floor(days / 30)} 个月前`;
        return (
          <Tooltip title={date.toLocaleString("zh-CN", { hour12: false })}>
            <span>{label}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "操作",
      key: "actions",
      width: 60,
      align: "right" as const,
      sorter: false,
      render: (_: unknown, record: User) => (
        <Dropdown
          menu={{
            items: [
              {
                key: "edit",
                icon: <Pencil size={token.fontSize} />,
                label: "编辑",
                onClick: () => {
                  setEditingUser(record);
                  form.setFieldsValue(record);
                  setModalOpen(true);
                },
              },
              {
                key: "delete",
                icon: <Trash2 size={token.fontSize} />,
                label: "删除",
                danger: true,
                onClick: () => confirmDelete(record),
              },
            ],
          }}
          placement="bottomRight"
        >
          <Button type="text" icon={<MoreVertical size={token.fontSize} />} />
        </Dropdown>
      ),
    },
  ];

  const applySearch = (keyword: string) => {
    void navigate({
      search: {
        ...search,
        keyword: keyword.trim(),
        offset: 0,
      },
    });
  };

  const showPagination = (data?.total ?? 0) > search.limit;

  useLayoutEffect(() => {
    const shell = pageShellRef.current;
    const toolbarEl = toolbarRowRef.current;
    const mid = middleSectionRef.current;
    if (!shell || !toolbarEl || !mid) return;

    /** Fixed small table header row height */
    const headReserve = 40;
    /** Ant Design Table size="small" row ~39px; slightly higher for Tags / selection column */
    const rowEstimate = 44;
    const paginationBlock = 56;

    let rafRetry = 0;
    const maxRafRetries = 8;

    const measure = () => {
      const toolbarRect = toolbarEl.getBoundingClientRect();
      /**
       * Do not use the page shell bottom: when the table stretches the document, shell.bottom moves down and
       * `available` becomes too large, so we skip scroll.y. Use the main content box bottom (viewport-bounded) instead.
       */
      const mainEl = shell.closest<HTMLElement>(".main-layout-main");
      const mainRect = mainEl?.getBoundingClientRect();
      const viewportBottom =
        typeof window !== "undefined" ? window.innerHeight : Number.POSITIVE_INFINITY;
      const clipBottom = mainRect
        ? mainRect.bottom
        : Math.min(shell.getBoundingClientRect().bottom, viewportBottom);

      const maxMiddleFromShell = Math.max(
        0,
        Math.floor(clipBottom - toolbarRect.bottom - token.marginLG),
      );

      const midHRaw = mid.clientHeight;
      const midH = midHRaw > 0 ? Math.min(midHRaw, maxMiddleFromShell) : maxMiddleFromShell;

      if (maxMiddleFromShell === 0 && rafRetry < maxRafRetries) {
        rafRetry += 1;
        requestAnimationFrame(() => requestAnimationFrame(measure));
        return;
      }

      /** Bordered frame now includes Table built-in pagination */
      const frameInner = Math.max(0, Math.floor(midH));
      tableAvailableRef.current = frameInner;

      setTableAreaMaxHeight(frameInner > 0 ? frameInner : undefined);

      const rowCount = data?.list?.length ?? 0;
      const pagReserve = showPagination ? paginationBlock : 0;
      const bodyMax = Math.max(120, frameInner - headReserve - pagReserve);

      if (isLoading && rowCount === 0) {
        setTableScrollY(bodyMax);
        return;
      }

      if (rowCount === 0 && !isLoading) {
        setTableScrollY(undefined);
        return;
      }

      const naturalBodyH = headReserve + rowCount * rowEstimate;
      const naturalTotalH = naturalBodyH + pagReserve;
      const slack = 12;

      /**
       * Without scroll.y, Ant Design does not scroll .ant-table-body; the full table height moves scrolling to the page.
       * Row-height estimates can wrongly say “fits”. After clearing scroll.y, re-check frame scrollHeight vs clientHeight.
       */
      if (naturalTotalH + slack > frameInner) {
        setTableScrollY(bodyMax);
        return;
      }

      setTableScrollY(undefined);
      requestAnimationFrame(() => {
        const frame = tableFrameRef.current;
        const avail = tableAvailableRef.current;
        const minFrame = headReserve + pagReserve;
        if (!frame || avail <= minFrame) return;
        if (frame.scrollHeight > frame.clientHeight + 1) {
          setTableScrollY(Math.max(120, avail - headReserve - pagReserve));
        }
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(shell);
    ro.observe(mid);
    return () => ro.disconnect();
  }, [showPagination, data?.list?.length, isLoading, token.marginLG]);

  const tablePagination: false | TablePaginationConfig = useMemo(
    () =>
      showPagination
        ? {
            total: data?.total ?? 0,
            current: currentPage,
            pageSize: search.limit,
            showSizeChanger: true,
            showTotal: (total) => `${total} rows`,
            onChange: (page, pageSize) => {
              void navigate({
                search: {
                  ...search,
                  limit: pageSize ?? search.limit,
                  offset: (page - 1) * (pageSize ?? search.limit),
                },
              });
            },
          }
        : false,
    [showPagination, data?.total, currentPage, search, navigate],
  );

  return (
    <Flex
      ref={pageShellRef}
      vertical
      gap={token.marginMD}
      style={{ flex: "1 1 0%", minHeight: 0, overflow: "hidden" }}
    >
      <Toolbar
        ref={toolbarRowRef}
        keywordInput={keywordInput}
        onKeywordChange={setKeywordInput}
        onSearch={applySearch}
        onClearSearch={() => {
          setKeywordInput("");
          applySearch("");
        }}
        onCreateClick={() => {
          setEditingUser(null);
          form.resetFields();
          setModalOpen(true);
        }}
      />

      <DataTable<User>
        layoutRef={middleSectionRef}
        frameRef={tableFrameRef}
        lockScrollHeight={tableScrollY != null}
        maxHeight={tableAreaMaxHeight}
        frameHeight={
          tableScrollY != null && tableAreaMaxHeight != null ? tableAreaMaxHeight : undefined
        }
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={data?.list ?? []}
        loading={isLoading}
        pagination={tablePagination}
        style={{ flex: 1, minHeight: 0 }}
        scroll={tableScrollY != null ? { x: "max-content", y: tableScrollY } : { x: "max-content" }}
        onChange={(_pagination, _filters, sorter) => {
          if (Array.isArray(sorter)) return;
          const nextSortField = sorter.order ? String(sorter.field) : "username";
          const nextSortOrder = sorter.order ? sorter.order : "descend";
          void navigate({
            search: {
              ...search,
              sortField: nextSortField,
              sortOrder: nextSortOrder,
            },
          });
        }}
      />

      <FormModal
        open={modalOpen}
        editingUser={editingUser}
        form={form}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        onCancel={() => {
          setModalOpen(false);
          setEditingUser(null);
          form.resetFields();
        }}
        onFinish={(values) => {
          if (editingUser) {
            const { password, ...rest } = values;
            const newPassword = password?.trim();
            updateMutation.mutate({
              ...rest,
              ...(newPassword ? { password: newPassword } : {}),
              id: editingUser.id,
            });
          } else {
            createMutation.mutate(CreateUserRequestSchema.parse(values));
          }
        }}
      />
    </Flex>
  );
}
