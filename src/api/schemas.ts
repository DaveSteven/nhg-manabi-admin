import { z } from "zod/v4";

/**
 * Real backend (`nhg-manabi-api`) admin user (`AdminUserOut`).
 * Field names stay snake_case to match the API contract verbatim.
 */
export const UserSchema = z.object({
  id: z.int(),
  username: z.string(),
  display_name: z.string(),
  current_level: z.string(),
  is_admin: z.boolean(),
  created_at: z.string(),
  last_active_at: z.string().nullable(),
});

export type User = z.infer<typeof UserSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const PermissionsListSchema = z.array(z.string());

export type PermissionsList = z.infer<typeof PermissionsListSchema>;

const BaseMenuNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  permissions: z.array(z.string()).nullable(),
  sort: z.int(),
  hidden: z.boolean(),
});

export type MenuItem =
  | (z.infer<typeof BaseMenuNodeSchema> & {
      kind: "item";
      path: string;
      children: MenuItem[] | null;
    })
  | (z.infer<typeof BaseMenuNodeSchema> & {
      kind: "group";
      path: null;
      children: MenuItem[];
    });

export const MenuItemSchema: z.ZodType<MenuItem> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    BaseMenuNodeSchema.extend({
      kind: z.literal("item"),
      path: z.string(),
      children: z.array(MenuItemSchema).nullable(),
    }),
    BaseMenuNodeSchema.extend({
      kind: z.literal("group"),
      path: z.null(),
      children: z.array(MenuItemSchema),
    }),
  ]),
);

export function ApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    code: z.int(),
    data: dataSchema,
    message: z.string(),
  });
}

export type ApiResponse<T> = {
  code: number;
  data: T;
  message: string;
};

export function PaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    code: z.int(),
    data: z.object({
      list: z.array(itemSchema),
      total: z.int(),
    }),
    message: z.string(),
  });
}

export type PaginatedData<T> = {
  list: T[];
  total: number;
};

export const SearchParamsSchema = z.object({
  page: z.number().int().positive().catch(1),
  pageSize: z.number().int().positive().catch(10),
  sortField: z.string().nullable().catch(null),
  sortOrder: z.enum(["ascend", "descend"]).nullable().catch(null),
});

export type SearchParams = z.infer<typeof SearchParamsSchema>;

export const EXAM_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

/** `POST /api/admin/users` body. */
export const CreateUserRequestSchema = z.object({
  username: z.string().min(1),
  display_name: z.string().min(1),
  password: z.string().min(1),
  current_level: z.enum(EXAM_LEVELS).catch("N5"),
  is_admin: z.boolean().catch(false),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

/** `PUT /api/admin/users/{id}` body — all fields optional. */
export const UpdateUserRequestSchema = CreateUserRequestSchema.partial();

export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

/**
 * Real backend (`nhg-manabi-api`) session user (`UserOut`).
 * Field names stay snake_case to match the API contract verbatim.
 */
export const SessionUserSchema = z.object({
  id: z.int(),
  username: z.string(),
  display_name: z.string(),
  current_level: z.string(),
  is_admin: z.boolean(),
});

export type SessionUserBase = z.infer<typeof SessionUserSchema>;

/** `POST /api/auth/login` response: single bearer token, unwrapped JSON. */
export const SessionSchema = z.object({
  token: z.string().min(1),
  expires_at: z.string(),
  user: SessionUserSchema,
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Frontend session user: base `UserOut` plus permissions derived from
 * `is_admin` (the real backend has no permissions endpoint).
 */
export type SessionUser = SessionUserBase & { permissions: string[] };

/** Permission granted to admins; gates the 真题校正 page (reuses user:view). */
export const ADMIN_PERMISSIONS = ["user:view"] as const;

export function toSessionUser(base: SessionUserBase): SessionUser {
  return { ...base, permissions: base.is_admin ? [...ADMIN_PERMISSIONS] : [] };
}

/*
 * Exam question review (真题校正) — `nhg-manabi-api` `/api/admin/exam-questions`.
 * All field names stay snake_case to match the API contract verbatim.
 */

export const ANSWER_STATUSES = [
  { value: "unverified", label: "未校验" },
  { value: "auto_verified", label: "自动校验" },
  { value: "verified", label: "人工确认" },
  { value: "disputed", label: "存疑" },
  { value: "corrected", label: "已修正" },
] as const;

export const ANALYSIS_STATUSES = [
  { value: "missing", label: "缺少解析" },
  { value: "draft", label: "整理草稿" },
  { value: "reviewed", label: "审核完成" },
  { value: "disputed", label: "解析存疑" },
] as const;

export const EXAM_CATEGORIES = [
  { value: "", label: "全部分类" },
  { value: "vocabulary", label: "文字词汇" },
  { value: "grammar", label: "文法" },
  { value: "reading", label: "读解" },
  { value: "listening", label: "听力" },
] as const;

export const ExamOptionSchema = z.object({
  id: z.int(),
  text: z.string(),
  source_order: z.int(),
});

export type ExamOption = z.infer<typeof ExamOptionSchema>;

export const ExamQuestionListItemSchema = z.object({
  id: z.int(),
  exam_id: z.int(),
  exam_title: z.string(),
  level: z.string(),
  order_index: z.int(),
  question_type: z.int().nullable(),
  category: z.string(),
  category_label: z.string(),
  title: z.string(),
  passage: z.string(),
  correct_option_id: z.int().nullable(),
  answer_status: z.string(),
  analysis_status: z.string(),
  answer_version: z.int(),
  reviewed_at: z.string().nullable(),
  /** 题组 (layer) info — grammar/reading groups share one passage across 小题. */
  layer_id: z.int(),
  layer_order: z.int(),
  layer_title: z.string(),
  options: z.array(ExamOptionSchema),
});

export type ExamQuestionListItem = z.infer<typeof ExamQuestionListItemSchema>;

/** Exam paper with review progress — 真题校正 paper list. */
export const AdminExamListItemSchema = z.object({
  id: z.int(),
  title: z.string(),
  level: z.string(),
  exam_date: z.int().nullable(),
  question_count: z.int(),
  answer_confirmed: z.int(),
  analysis_reviewed: z.int(),
  disputed: z.int(),
});

export type AdminExamListItem = z.infer<typeof AdminExamListItemSchema>;

export const AdminExamListSchema = z.object({
  items: z.array(AdminExamListItemSchema),
  total: z.int(),
});

export type AdminExamList = z.infer<typeof AdminExamListSchema>;

export const ExamQuestionListSchema = z.object({
  items: z.array(ExamQuestionListItemSchema),
  total: z.int(),
  page: z.int(),
  page_size: z.int(),
});

export type ExamQuestionList = z.infer<typeof ExamQuestionListSchema>;

export const ExamQuestionRevisionSchema = z.object({
  id: z.int(),
  user_id: z.int(),
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
  note: z.string(),
  created_at: z.string(),
});

export type ExamQuestionRevision = z.infer<typeof ExamQuestionRevisionSchema>;

/**
 * Detail response omits `category`/`category_label` (the list serializer adds
 * them but the detail serializer does not), so they are derived from
 * `question_type` — same rules as the backend's `exam_question_category`.
 */
function examCategoryFromType(questionType: number | null): {
  category: string;
  category_label: string;
} {
  const value = questionType ?? 0;
  if (value >= 41) return { category: "listening", category_label: "听力" };
  if (value >= 31) return { category: "reading", category_label: "读解" };
  if (value >= 21) return { category: "grammar", category_label: "文法" };
  return { category: "vocabulary", category_label: "文字词汇" };
}

const ExamQuestionDetailBaseSchema = ExamQuestionListItemSchema.omit({
  correct_option_id: true,
  category: true,
  category_label: true,
  // Detail responses carry only `layer_id` (the layer external id), not the
  // list-only layer_order/layer_title grouping fields.
  layer_order: true,
  layer_title: true,
});

export const ExamQuestionDetailSchema = ExamQuestionDetailBaseSchema.extend({
  correct_option_id: z.int().nullable(),
  layer_id: z.string().nullable().catch(null),
  subtitle: z.string().catch(""),
  image_url: z.string().nullable().catch(null),
  media_url: z.string().nullable().catch(null),
  options: z.array(ExamOptionSchema),
  translation: z.string(),
  analysis: z.string(),
  analysis_document: z.record(z.string(), z.unknown()).catch({}),
  review_note: z.string(),
  reviewed_by: z.int().nullable(),
  reviewed_at: z.string().nullable(),
  answer_version: z.int(),
  revisions: z.array(ExamQuestionRevisionSchema).catch([]),
}).transform((detail) => ({ ...detail, ...examCategoryFromType(detail.question_type) }));

export type ExamQuestionDetail = z.infer<typeof ExamQuestionDetailSchema>;

/** 問題工作台：整組小题的修订数据。 */
export const ExamQuestionLayerSchema = z.object({
  items: z.array(ExamQuestionDetailSchema),
  total: z.int(),
  /** 题组级共享图片（读解图表/听力场景图）。 */
  layer_image_url: z.string().nullable().catch(null),
});

export type ExamQuestionLayer = z.infer<typeof ExamQuestionLayerSchema>;

export const ExamQuestionUpdateSchema = z.object({
  /** Nullable: questions without a marked correct option return null from the API. */
  correct_option_id: z.int().nullable(),
  answer_status: z.string(),
  analysis_status: z.string(),
  subtitle: z.string().default(""),
  translation: z.string().default(""),
  analysis: z.string().default(""),
  analysis_document: z.record(z.string(), z.unknown()).default({}),
  review_note: z.string().default(""),
});

export type ExamQuestionUpdate = z.infer<typeof ExamQuestionUpdateSchema>;

/*
 * Learning statistics — 学生端 `/api/stats/*` 与 admin 端
 * `/api/admin/users/{id}/stats/*` 共用同一份聚合结构，字段保持 snake_case。
 */

export const StatsStreakSchema = z.object({
  current: z.int(),
  longest: z.int(),
  last_active_date: z.string().nullable(),
});

export type StatsStreak = z.infer<typeof StatsStreakSchema>;

export const StatsTotalsSchema = z.object({
  practice_attempts: z.int(),
  exam_attempts: z.int(),
  listening_attempts: z.int(),
  questions_answered: z.int(),
  questions_correct: z.int(),
  overall_accuracy: z.number().nullable(),
});

export type StatsTotals = z.infer<typeof StatsTotalsSchema>;

export const StatsActivityDaySchema = z.object({
  date: z.string(),
  answered: z.int(),
  correct: z.int(),
});

export type StatsActivityDay = z.infer<typeof StatsActivityDaySchema>;

export const StatsLevelBreakdownSchema = z.object({
  level: z.string(),
  correct: z.int(),
  total: z.int(),
  accuracy: z.number().nullable(),
});

export type StatsLevelBreakdown = z.infer<typeof StatsLevelBreakdownSchema>;

export const StatsSubjectBreakdownSchema = z.object({
  subject: z.string(),
  label: z.string(),
  correct: z.int(),
  total: z.int(),
  accuracy: z.number().nullable(),
});

export type StatsSubjectBreakdown = z.infer<typeof StatsSubjectBreakdownSchema>;

export const StatsOverviewSchema = z.object({
  totals: StatsTotalsSchema,
  streak: StatsStreakSchema,
  activity: z.array(StatsActivityDaySchema),
  breakdown_by_level: z.array(StatsLevelBreakdownSchema),
  breakdown_by_subject: z.array(StatsSubjectBreakdownSchema),
});

export type StatsOverview = z.infer<typeof StatsOverviewSchema>;

export const StatsTrendPointSchema = z.object({
  period: z.string(),
  answered: z.int(),
  correct: z.int(),
  accuracy: z.number().nullable(),
  attempts: z.int(),
});

export type StatsTrendPoint = z.infer<typeof StatsTrendPointSchema>;

export const StatsTrendSchema = z.object({
  points: z.array(StatsTrendPointSchema),
});

export type StatsTrend = z.infer<typeof StatsTrendSchema>;

/*
 * Dashboard 全局汇总 — `/api/admin/stats/summary`。
 */

export const AdminTrendPointSchema = z.object({
  period: z.string(),
  count: z.int(),
});

export type AdminTrendPoint = z.infer<typeof AdminTrendPointSchema>;

export const AdminSummarySchema = z.object({
  totals: z.object({
    users: z.int(),
    admins: z.int(),
    active_users_7d: z.int(),
    new_users_7d: z.int(),
    questions_answered: z.int(),
    questions_answered_7d: z.int(),
  }),
  registration_trend: z.array(AdminTrendPointSchema),
  activity_trend: z.array(AdminTrendPointSchema),
});

export type AdminSummary = z.infer<typeof AdminSummarySchema>;
