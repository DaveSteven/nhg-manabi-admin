import { httpClient } from "@/utils/http";
import {
  ExamQuestionDetailSchema,
  ExamQuestionListSchema,
  ExamQuestionUpdateSchema,
} from "./schemas";
import type { ExamQuestionDetail, ExamQuestionList, ExamQuestionUpdate } from "./schemas";

export const EXAM_QUESTION_ENDPOINTS = {
  list: "/api/admin/exam-questions",
  detail: (id: number) => `/api/admin/exam-questions/${id}`,
  update: (id: number) => `/api/admin/exam-questions/${id}`,
} as const;

export type ExamQuestionListParams = {
  q?: string;
  level?: string;
  category?: string;
  answer_status?: string;
  analysis_status?: string;
  exam_year?: number;
  exam_month?: number;
  page?: number;
  page_size?: number;
};

export function fetchExamQuestionList(params: ExamQuestionListParams): Promise<ExamQuestionList> {
  return httpClient
    .get(EXAM_QUESTION_ENDPOINTS.list, { params: { ...params } })
    .then((raw) => ExamQuestionListSchema.parse(raw));
}

export function fetchExamQuestionDetail(id: number): Promise<ExamQuestionDetail> {
  return httpClient
    .get(EXAM_QUESTION_ENDPOINTS.detail(id))
    .then((raw) => ExamQuestionDetailSchema.parse(raw));
}

export function updateExamQuestion(
  id: number,
  values: ExamQuestionUpdate,
): Promise<ExamQuestionDetail> {
  return httpClient
    .patch(EXAM_QUESTION_ENDPOINTS.update(id), ExamQuestionUpdateSchema.parse(values))
    .then((raw) => ExamQuestionDetailSchema.parse(raw));
}

export type { ExamQuestionDetail, ExamQuestionList, ExamQuestionUpdate };
