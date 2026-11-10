import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Card, Col, Flex, Row, Statistic, Typography, theme } from "antd";
import "./index.css";
import { fetchAdminStatsSummary } from "@/api/stats";
import type { AdminTrendPoint, StatsTrendPoint } from "@/api/schemas";
import { useSettingsStore } from "@/stores/settings";
import { UserTrendChart } from "../users/-UserTrendChart";

const { Text } = Typography;

export const Route = createFileRoute("/_auth/dashboard/")({
  component: DashboardPage,
});

/** 注册/做题趋势都挂在前 30 天的 `count` 上，复用用户趋势折线的呈现。 */
function toTrendPoints(points: AdminTrendPoint[]): StatsTrendPoint[] {
  return points.map((p) => ({
    period: p.period,
    answered: p.count,
    correct: 0,
    accuracy: null,
    attempts: 0,
  }));
}

function DashboardPage() {
  const { token } = theme.useToken();
  const darkMode = useSettingsStore((s) => s.darkMode);

  const summaryQuery = useQuery({
    queryKey: ["admin-stats-summary"],
    queryFn: fetchAdminStatsSummary,
    staleTime: 60_000,
  });
  const summary = summaryQuery.data;

  const tiles = [
    {
      title: "总用户数",
      value: summary?.totals.users,
      description: summary ? `管理员 ${summary.totals.admins} 人` : "",
    },
    {
      title: "7 日活跃用户",
      value: summary?.totals.active_users_7d,
      description: summary ? `占比 ${
        summary.totals.users > 0
          ? Math.round((summary.totals.active_users_7d / summary.totals.users) * 100)
          : 0
      }%` : "",
    },
    {
      title: "7 日新增用户",
      value: summary?.totals.new_users_7d,
      description: summary ? `总用户 ${summary.totals.users} 人` : "",
    },
    {
      title: "累计做题",
      value: summary?.totals.questions_answered,
      description: summary ? `近 7 天 ${summary.totals.questions_answered_7d} 题` : "",
    },
  ];

  return (
    <Flex vertical gap={token.marginLG}>
      <Row gutter={[16, 16]}>
        {tiles.map((tile) => (
          <Col xs={24} sm={12} lg={6} key={tile.title}>
            <Card loading={summaryQuery.isLoading}>
              <Statistic title={tile.title} value={tile.value ?? 0} />
              {tile.description ? (
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {tile.description}
                </Text>
              ) : null}
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="注册趋势（近 30 天）" loading={summaryQuery.isLoading}>
            <UserTrendChart
              points={toTrendPoints(summary?.registration_trend ?? [])}
              metric="volume"
              granularity="day"
              darkMode={darkMode}
              unit="人"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="做题趋势（近 30 天）" loading={summaryQuery.isLoading}>
            <UserTrendChart
              points={toTrendPoints(summary?.activity_trend ?? [])}
              metric="volume"
              granularity="day"
              darkMode={darkMode}
              unit="题"
            />
          </Card>
        </Col>
      </Row>
    </Flex>
  );
}
