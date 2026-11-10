import type { AdminSummary } from "./schemas";
import { AdminSummarySchema } from "./schemas";
import { httpClient } from "@/utils/http";

/** `GET /api/admin/stats/summary` — dashboard 全局汇总。 */
export function fetchAdminStatsSummary(): Promise<AdminSummary> {
  return httpClient.get("/api/admin/stats/summary").then((raw) => AdminSummarySchema.parse(raw));
}
