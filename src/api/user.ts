import type { StatsOverview, StatsTrend, User, CreateUserRequest, UpdateUserRequest } from "./schemas";
import { StatsOverviewSchema, StatsTrendSchema, UserSchema } from "./schemas";
import { httpClient } from "@/utils/http";

export const USER_ENDPOINTS = {
  list: "/api/admin/users",
  create: "/api/admin/users",
  detail: (id: string | number) => `/api/admin/users/${id}`,
  update: (id: string | number) => `/api/admin/users/${id}`,
  delete: (id: string | number) => `/api/admin/users/${id}`,
  disable: (id: string | number) => `/api/admin/users/${id}/disable`,
  enable: (id: string | number) => `/api/admin/users/${id}/enable`,
  statsOverview: (id: string | number) => `/api/admin/users/${id}/stats/overview`,
  statsTrend: (id: string | number) => `/api/admin/users/${id}/stats/trend`,
} as const;

export function fetchUserProfile(id: string | number): Promise<User> {
  return httpClient.get(USER_ENDPOINTS.detail(id)).then((raw) => UserSchema.parse(raw));
}

/** 停用（T-031）：保留数据 + 禁止登录 + 立即失效现有会话，可恢复。 */
export function disableUser(id: string | number): Promise<User> {
  return httpClient.post(USER_ENDPOINTS.disable(id)).then((raw) => UserSchema.parse(raw));
}

/** 恢复：仅清除停用状态，重新登录即恢复。 */
export function enableUser(id: string | number): Promise<User> {
  return httpClient.post(USER_ENDPOINTS.enable(id)).then((raw) => UserSchema.parse(raw));
}

export function fetchUserStatsOverview(id: string | number): Promise<StatsOverview> {
  return httpClient.get(USER_ENDPOINTS.statsOverview(id)).then((raw) => StatsOverviewSchema.parse(raw));
}

export function fetchUserStatsTrend(
  id: string | number,
  params: { granularity: "day" | "week" | "month"; days: number },
): Promise<StatsTrend> {
  return httpClient
    .get(USER_ENDPOINTS.statsTrend(id), { params })
    .then((raw) => StatsTrendSchema.parse(raw));
}

export type { CreateUserRequest, UpdateUserRequest, User };
