import { httpClient } from "@/utils/http";
import {
  AdminExamListSchema,
  ExamQuestionDetailSchema,
  ExamQuestionLayerSchema,
  ExamQuestionListSchema,
  ExamQuestionUpdateSchema,
} from "./schemas";
import type {
  AdminExamList,
  ExamQuestionDetail,
  ExamQuestionLayer,
  ExamQuestionList,
  ExamQuestionUpdate,
} from "./schemas";

export const EXAM_QUESTION_ENDPOINTS = {
  exams: "/api/admin/exams",
  list: "/api/admin/exam-questions",
  layerQuestions: (layerId: number) => `/api/admin/exam-layers/${layerId}/questions`,
  detail: (id: number) => `/api/admin/exam-questions/${id}`,
  update: (id: number) => `/api/admin/exam-questions/${id}`,
} as const;

export type AdminExamListParams = {
  q?: string;
  level?: string;
  exam_year?: number;
};

export function fetchAdminExams(params: AdminExamListParams): Promise<AdminExamList> {
  return httpClient
    .get(EXAM_QUESTION_ENDPOINTS.exams, { params: { ...params } })
    .then((raw) => AdminExamListSchema.parse(raw));
}

export type ExamQuestionListParams = {
  q?: string;
  level?: string;
  category?: string;
  answer_status?: string;
  analysis_status?: string;
  exam_year?: number;
  exam_month?: number;
  exam_id?: number;
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

/** 問題工作台：一次取整組小题的完整修订数据（含题组级共享图片）。 */
export function fetchExamLayerQuestions(layerId: number): Promise<ExamQuestionLayer> {
  return httpClient
    .get(EXAM_QUESTION_ENDPOINTS.layerQuestions(layerId))
    .then((raw) => ExamQuestionLayerSchema.parse(raw));
}

export function updateExamQuestion(
  id: number,
  values: ExamQuestionUpdate,
): Promise<ExamQuestionDetail> {
  return httpClient
    .patch(EXAM_QUESTION_ENDPOINTS.update(id), ExamQuestionUpdateSchema.parse(values))
    .then((raw) => ExamQuestionDetailSchema.parse(raw));
}

export type { AdminExamList, ExamQuestionDetail, ExamQuestionList, ExamQuestionUpdate };
