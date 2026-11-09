import { http, HttpResponse } from "msw";
import { MOCK_EXAM_QUESTIONS } from "../data";
import type { MockExamQuestion } from "../data";
import { withDelay } from "../createHandler";

/**
 * Mirrors `nhg-manabi-api` `/api/admin/exam-questions`: bare JSON, snake_case,
 * PATCH bumps `answer_version` and appends a revision.
 */

const ANSWER_STATUSES = new Set(["unverified", "auto_verified", "verified", "disputed", "corrected"]);
const ANALYSIS_STATUSES = new Set(["missing", "draft", "reviewed", "disputed"]);

function snapshot(question: MockExamQuestion) {
  return {
    correct_option_id: question.correct_option_id,
    answer_status: question.answer_status,
    analysis_status: question.analysis_status,
    translation: question.translation,
    analysis: question.analysis,
    analysis_document: question.analysis_document,
    review_note: question.review_note,
    answer_version: question.answer_version,
  };
}

export const examQuestionHandlers = [
  http.get("/api/admin/exam-questions", async ({ request }) => {
    await withDelay(200);
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const level = url.searchParams.get("level") ?? "";
    const category = url.searchParams.get("category") ?? "";
    const answerStatus = url.searchParams.get("answer_status") ?? "";
    const analysisStatus = url.searchParams.get("analysis_status") ?? "";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("page_size") ?? "30")));

    let rows = [...MOCK_EXAM_QUESTIONS];
    if (q) {
      rows = rows.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.passage.toLowerCase().includes(q) ||
          item.options.some((option) => option.text.toLowerCase().includes(q)),
      );
    }
    if (level) rows = rows.filter((item) => item.level === level);
    if (category) rows = rows.filter((item) => item.category === category);
    if (answerStatus) rows = rows.filter((item) => item.answer_status === answerStatus);
    if (analysisStatus) rows = rows.filter((item) => item.analysis_status === analysisStatus);

    const start = (page - 1) * pageSize;
    const items = rows.slice(start, start + pageSize).map((question) => {
      const { options: _options, revisions: _revisions, translation: _t, analysis: _a, analysis_document: _d, review_note: _r, reviewed_by: _rb, subtitle: _s, image_url: _i, media_url: _m, layer_id: _l, ...listItem } = question;
      return listItem;
    });

    return HttpResponse.json({ items, total: rows.length, page, page_size: pageSize });
  }),

  http.get("/api/admin/exam-questions/:id", async ({ params }) => {
    await withDelay(200);
    const question = MOCK_EXAM_QUESTIONS.find((item) => item.id === Number(params.id));
    if (!question) {
      return HttpResponse.json({ detail: "Exam question not found" }, { status: 404 });
    }
    return HttpResponse.json(question);
  }),

  http.patch("/api/admin/exam-questions/:id", async ({ params, request }) => {
    await withDelay(300);
    const question = MOCK_EXAM_QUESTIONS.find((item) => item.id === Number(params.id));
    if (!question) {
      return HttpResponse.json({ detail: "Exam question not found" }, { status: 404 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    if (!ANSWER_STATUSES.has(String(body.answer_status))) {
      return HttpResponse.json({ detail: "Invalid answer review status" }, { status: 422 });
    }
    if (!ANALYSIS_STATUSES.has(String(body.analysis_status))) {
      return HttpResponse.json({ detail: "Invalid analysis review status" }, { status: 422 });
    }
    const correctOptionId = Number(body.correct_option_id);
    if (!question.options.some((option) => option.id === correctOptionId)) {
      return HttpResponse.json({ detail: "Correct option must belong to this question" }, { status: 422 });
    }

    const before = snapshot(question);
    question.correct_option_id = correctOptionId;
    question.answer_status = String(body.answer_status);
    question.analysis_status = String(body.analysis_status);
    question.translation = typeof body.translation === "string" ? body.translation : "";
    question.analysis = typeof body.analysis === "string" ? body.analysis : "";
    question.analysis_document = (body.analysis_document as Record<string, string>) ?? {};
    question.review_note = typeof body.review_note === "string" ? body.review_note : "";
    question.reviewed_by = 1;
    question.reviewed_at = new Date().toISOString();
    question.answer_version += 1;
    question.revisions = [
      {
        id: question.revisions.length + 1,
        user_id: 1,
        before,
        after: snapshot(question),
        note: question.review_note,
        created_at: question.reviewed_at,
      },
      ...question.revisions,
    ];
    return HttpResponse.json(question);
  }),
];
