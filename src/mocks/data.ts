import type { User } from "@/api/schemas";
import { vercelAvatarUrl } from "./utils";

/** Demo logins look like real org accounts (first.last @ northstar.io). Index 0 stays `admin` for mock login. */
const MOCK_IDENTITIES: ReadonlyArray<[string, string]> = [
  ["admin", "ops.admin@northstar.io"],
  ["zhao.ming", "zhao.ming@northstar.io"],
  ["sarah.chen", "sarah.chen@northstar.io"],
  ["james.park", "james.park@northstar.io"],
  ["emma.garcia", "emma.garcia@northstar.io"],
  ["ryan.kim", "ryan.kim@northstar.io"],
  ["olivia.tanaka", "olivia.tanaka@northstar.io"],
  ["liam.patel", "liam.patel@northstar.io"],
  ["ava.nguyen", "ava.nguyen@northstar.io"],
  ["noah.berg", "noah.berg@northstar.io"],
  ["mia.silva", "mia.silva@northstar.io"],
];

export const MOCK_USERS: User[] = MOCK_IDENTITIES.map(([username, email], i) => ({
  id: String(i + 1),
  username,
  avatar: vercelAvatarUrl(username),
  email,
  roles: i === 0 ? ["admin"] : ["editor"],
  permissions: i === 0 ? ["user:view", "user:create", "user:edit", "user:delete"] : ["user:view"],
}));

/** Exam question review (真题校正) mock rows — same shape as `nhg-manabi-api` responses. */
export interface MockExamQuestion {
  id: number;
  exam_id: number;
  exam_title: string;
  level: string;
  order_index: number;
  question_type: number | null;
  category: string;
  category_label: string;
  title: string;
  passage: string;
  subtitle: string;
  image_url: string | null;
  media_url: string | null;
  options: Array<{ id: number; text: string; source_order: number }>;
  correct_option_id: number | null;
  answer_status: string;
  analysis_status: string;
  translation: string;
  analysis: string;
  analysis_document: Record<string, string>;
  review_note: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  answer_version: number;
  layer_id: string | null;
  revisions: Array<{
    id: number;
    user_id: number;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    note: string;
    created_at: string;
  }>;
}

interface MockExamQuestionSeed {
  id: number;
  exam_title: string;
  level: string;
  order_index: number;
  question_type: number;
  category: string;
  category_label: string;
  title: string;
  passage?: string;
  options: string[];
  correct: number;
  answer_status: string;
  analysis_status: string;
  translation?: string;
  analysis?: string;
  analysis_document?: Record<string, string>;
  review_note?: string;
  answer_version?: number;
  revisions?: MockExamQuestion["revisions"];
}

const MOCK_EXAM_QUESTION_SEEDS: MockExamQuestionSeed[] = [
  {
    id: 101,
    exam_title: "2022年12月 N2",
    level: "N2",
    order_index: 5,
    question_type: 3,
    category: "vocabulary",
    category_label: "文字词汇",
    title: "（　）の言葉の読み方として最もよいものを、１・２・３・４から一つ選びなさい。この会社は従業員の福利厚生に力を入れている。",
    options: ["ふくりこうせい", "ふくりこうせい", "ふくりこうせ", "ふうりこうせい"],
    correct: 2,
    answer_status: "corrected",
    analysis_status: "reviewed",
    translation: "这家公司注重员工福利。",
    analysis: "「福利厚生」读作「ふくりこうせい」，意为福利保健待遇。",
    analysis_document: {
      summary: "考查「福利厚生」的读音。",
      evidence: "福利厚生（ふくりこうせい）为固定读音词汇。",
      knowledge_points: "福利厚生：员工福利制度",
      tips: "注意「厚生」的读音为「こうせい」。",
    },
    review_note: "原数据标注为选项1，参照官方真题集修正为选项2。",
    answer_version: 2,
    revisions: [
      {
        id: 1,
        user_id: 1,
        before: { correct_option_id: 1, answer_status: "auto_verified" },
        after: { correct_option_id: 2, answer_status: "corrected" },
        note: "对照官方真题集修正正确答案。",
        created_at: "2026-10-12T09:30:00Z",
      },
    ],
  },
  {
    id: 102,
    exam_title: "2022年12月 N2",
    level: "N2",
    order_index: 12,
    question_type: 24,
    category: "grammar",
    category_label: "文法",
    title: "（　）に入れるのに最もよいものを、１・２・３・４から一つ選びなさい。雨が降っている（　）、試合は続行された。",
    options: ["にもかかわらず", "によって", "に応じて", "を中心に"],
    correct: 1,
    answer_status: "auto_verified",
    analysis_status: "draft",
    analysis: "「にもかかわらず」表示与前项相反的结果，意为“尽管……但是”。",
    review_note: "",
    answer_version: 0,
  },
  {
    id: 103,
    exam_title: "2021年7月 N1",
    level: "N1",
    order_index: 38,
    question_type: 33,
    category: "reading",
    category_label: "读解",
    passage:
      "近年、人工知能の発展により、多くの業務が自動化されつつある。しかし、機械が代替できない人間ならではの創造性の重要性はむしろ増していると言われる。",
    title: "筆者が言いたいことは何か。",
    options: [
      "人工知能は業務の自動化に役立たない",
      "人間の創造性はますます重要になっている",
      "機械は人間の創造性を完全に代替できる",
      "自動化によって創造性は不要になった",
    ],
    correct: 2,
    answer_status: "verified",
    analysis_status: "reviewed",
    translation: "笔者想表达的是：人类的创造力正变得越来越重要。",
    analysis: "结尾句「人間ならではの創造性の重要性はむしろ増している」为作者主张。",
    analysis_document: {
      summary: "抓住文末的主张句即可作答。",
      evidence: "「機械が代替できない人間ならではの創造性の重要性はむしろ増している」",
      knowledge_points: "「むしろ」：反而；「～ならでは」：唯有……才有的",
      tips: "读解题优先关注文末总结句。",
    },
    review_note: "解析已复核，无需修改。",
    answer_version: 1,
    revisions: [
      {
        id: 2,
        user_id: 1,
        before: { analysis_status: "missing" },
        after: { analysis_status: "reviewed" },
        note: "补充解析并完成审核。",
        created_at: "2026-10-20T14:05:00Z",
      },
    ],
  },
  {
    id: 104,
    exam_title: "2021年7月 N3",
    level: "N3",
    order_index: 21,
    question_type: 45,
    category: "listening",
    category_label: "听力",
    title: "問題用紙に何も印刷されていません。まず話を聞いてください。",
    options: ["男の人が教室を掃除する", "女の人が教室を掃除する", "二人で掃除する", "掃除しない"],
    correct: 3,
    answer_status: "unverified",
    analysis_status: "missing",
    review_note: "",
    answer_version: 0,
  },
  {
    id: 105,
    exam_title: "2020年12月 N1",
    level: "N1",
    order_index: 3,
    question_type: 1,
    category: "vocabulary",
    category_label: "文字词汇",
    title: "（　）の言葉に意味が最も似ているものを、１・２・３・４から一つ選びなさい。矛盾した発言を繰り返す。",
    options: ["食い違った", "堅苦しい", "そそっかしい", "おだやかな"],
    correct: 1,
    answer_status: "disputed",
    analysis_status: "disputed",
    translation: "反复发表自相矛盾的言论。",
    analysis: "「矛盾した」与「食い違った」含义相近，均表示前后不一致。",
    review_note: "解析存疑：选项4「おだやかな」是否更贴近原题语境，需要再核对官方解析。",
    answer_version: 1,
    revisions: [
      {
        id: 3,
        user_id: 1,
        before: { answer_status: "unverified" },
        after: { answer_status: "disputed" },
        note: "存疑待核。",
        created_at: "2026-11-01T11:12:00Z",
      },
    ],
  },
  {
    id: 106,
    exam_title: "2020年12月 N3",
    level: "N3",
    order_index: 18,
    question_type: 28,
    category: "grammar",
    category_label: "文法",
    title: "（　）に入れるのに最もよいものを、１・２・３・４から一つ選びなさい。母の（　）、私たちは育ちました。",
    options: ["おかげで", "せいで", "ために", "について"],
    correct: 1,
    answer_status: "unverified",
    analysis_status: "missing",
    review_note: "",
    answer_version: 0,
  },
];

export const MOCK_EXAM_QUESTIONS: MockExamQuestion[] = MOCK_EXAM_QUESTION_SEEDS.map((seed) => ({
  id: seed.id,
  exam_id: 900 + (seed.id % 10),
  exam_title: seed.exam_title,
  level: seed.level,
  order_index: seed.order_index,
  question_type: seed.question_type,
  category: seed.category,
  category_label: seed.category_label,
  title: seed.title,
  passage: seed.passage ?? "",
  subtitle: "",
  image_url: null,
  media_url: seed.category === "listening" ? "/mock-assets/listening-104.mp3" : null,
  options: seed.options.map((text, i) => ({ id: i + 1, text, source_order: i + 1 })),
  correct_option_id: seed.correct,
  answer_status: seed.answer_status,
  analysis_status: seed.analysis_status,
  translation: seed.translation ?? "",
  analysis: seed.analysis ?? "",
  analysis_document: seed.analysis_document ?? {},
  review_note: seed.review_note ?? "",
  reviewed_by: seed.answer_version && seed.answer_version > 0 ? 1 : null,
  reviewed_at:
    seed.answer_version && seed.answer_version > 0
      ? (seed.revisions?.[0]?.created_at ?? "2026-10-12T09:30:00Z")
      : null,
  answer_version: seed.answer_version ?? 0,
  layer_id: `layer-${seed.id}`,
  revisions: seed.revisions ?? [],
}));
