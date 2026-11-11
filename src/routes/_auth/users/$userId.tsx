import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Button,
  Card,
  Col,
  Flex,
  Row,
  Segmented,
  Skeleton,
  Statistic,
  Table,
  Tag,
  Typography,
  theme,
} from "antd";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { fetchUserProfile, fetchUserStatsOverview, fetchUserStatsTrend } from "@/api/user";
import { useSettingsStore } from "@/stores/settings";
import { formatApiDateTime } from "@/utils/datetime";
import { UserActivityHeatmap } from "./-UserActivityHeatmap";
import {
  GRAN_DAYS,
  UserTrendChart,
  type TrendGranularity,
  type TrendMetric,
} from "./-UserTrendChart";
import { LevelDistributionColumns, SubjectAccuracyBars } from "./-UserBreakdownCharts";

const { Text, Title } = Typography;

export const Route = createFileRoute("/_auth/users/$userId")({
  component: UserDetailPage,
});

const GRANULARITY_OPTIONS = [
  { value: "day", label: "按日" },
  { value: "week", label: "按周" },
  { value: "month", label: "按月" },
];

const METRIC_OPTIONS = [
  { value: "volume", label: "做题量" },
  { value: "accuracy", label: "正确率" },
];

function formatDate(value: string): string {
  return formatApiDateTime(value);
}

function UserDetailPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const darkMode = useSettingsStore((s) => s.darkMode);

  const [metric, setMetric] = useState<TrendMetric>("volume");
  const [granularity, setGranularity] = useState<TrendGranularity>("day");
  const [trendView, setTrendView] = useState<"chart" | "table">("chart");

  const profileQuery = useQuery({
    queryKey: ["admin-user-profile", userId],
    queryFn: () => fetchUserProfile(userId),
  });
  const overviewQuery = useQuery({
    queryKey: ["admin-user-stats", userId, "overview"],
    queryFn: () => fetchUserStatsOverview(userId),
  });
  const trendQuery = useQuery({
    queryKey: ["admin-user-stats", userId, "trend", granularity],
    queryFn: () => fetchUserStatsTrend(userId, { granularity, days: GRAN_DAYS[granularity] }),
  });

  const profile = profileQuery.data;
  const overview = overviewQuery.data;
  const trend = trendQuery.data;
  const profileInitial = (profile?.display_name ?? profile?.username ?? "")
    .trim()[0]
    ?.toUpperCase();

  return (
    <Flex vertical gap={token.marginMD} style={{ flex: "1 1 0%", minHeight: 0, overflow: "auto" }}>
      {/* 页头 */}
      <Flex align="center" gap={token.marginSM} wrap="wrap">
        <Button
          type="text"
          icon={<ArrowLeft size={token.fontSize} />}
          onClick={() =>
            void navigate({
              to: "/users",
              search: { limit: 100, offset: 0, sortField: null, sortOrder: null, keyword: "" },
            })
          }
        />
        {profile ? (
          <>
            <Avatar size={40} style={{ background: token.colorPrimary, flexShrink: 0 }}>
              {profileInitial}
            </Avatar>
            <Flex vertical>
              <Flex align="center" gap={token.marginSM}>
                <Title level={4} style={{ margin: 0 }}>
                  {profile.display_name}
                </Title>
                <Tag color="gold" variant="outlined" style={{ borderRadius: 9999 }}>
                  {profile.current_level}
                </Tag>
              </Flex>
              <Text type="secondary">
                @{profile.username} · 注册于 {formatDate(profile.created_at)}
              </Text>
            </Flex>
          </>
        ) : profileQuery.isError ? (
          <Text type="danger">用户不存在或已被删除</Text>
        ) : (
          <Skeleton.Input active size="small" style={{ width: 220 }} />
        )}
      </Flex>

      {/* 关键指标 */}
      <Row gutter={[token.marginSM, token.marginSM]}>
        {[
          { title: "总做题数", value: overview?.totals.questions_answered ?? 0 },
          {
            title: "总正确率",
            value: overview?.totals.overall_accuracy ?? null,
            suffix: overview?.totals.overall_accuracy != null ? "%" : undefined,
            precision: 1,
          },
          { title: "连续天数", value: overview?.streak.current ?? 0, suffix: "天" },
          { title: "最长连续", value: overview?.streak.longest ?? 0, suffix: "天" },
          { title: "练习完成", value: overview?.totals.practice_attempts ?? 0, suffix: "次" },
          { title: "考试完成", value: overview?.totals.exam_attempts ?? 0, suffix: "次" },
        ].map((tile) => (
          <Col key={tile.title} xs={12} md={4}>
            <Card size="small" loading={overviewQuery.isLoading}>
              <Statistic
                title={tile.title}
                value={tile.value ?? "-"}
                precision={tile.precision}
                suffix={tile.suffix}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 筛选行：作用于下方趋势图 */}
      <Flex gap={token.marginSM} align="center" wrap="wrap">
        <Text type="secondary">趋势范围</Text>
        <Segmented
          options={GRANULARITY_OPTIONS}
          value={granularity}
          onChange={(v) => setGranularity(v as TrendGranularity)}
        />
        <Segmented
          options={METRIC_OPTIONS}
          value={metric}
          onChange={(v) => setMetric(v as TrendMetric)}
        />
      </Flex>

      <Row gutter={[token.marginMD, token.marginMD]}>
        <Col xs={24} xl={16}>
          <Card
            size="small"
            title="做题趋势"
            loading={trendQuery.isLoading}
            extra={
              <Segmented
                size="small"
                options={[
                  { value: "chart", label: "图表" },
                  { value: "table", label: "数据" },
                ]}
                value={trendView}
                onChange={(v) => setTrendView(v as "chart" | "table")}
              />
            }
          >
            {trendView === "chart" ? (
              <UserTrendChart
                points={trend?.points ?? []}
                metric={metric}
                granularity={granularity}
                darkMode={darkMode}
              />
            ) : (
              <Table
                size="small"
                rowKey="period"
                dataSource={trend?.points ?? []}
                pagination={false}
                scroll={{ y: 200 }}
                columns={[
                  {
                    title: "期间",
                    dataIndex: "period",
                    render: (v: string) => formatDate(v).slice(0, 10),
                  },
                  { title: "做题量", dataIndex: "answered" },
                  { title: "答对", dataIndex: "correct" },
                  {
                    title: "正确率",
                    dataIndex: "accuracy",
                    render: (v: number | null) => (v != null ? `${v}%` : "—"),
                  },
                  { title: "练习次数", dataIndex: "attempts" },
                ]}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card size="small" title="科目正确率" loading={overviewQuery.isLoading}>
            <SubjectAccuracyBars
              breakdown={overview?.breakdown_by_subject ?? []}
              darkMode={darkMode}
            />
          </Card>
        </Col>
        <Col xs={24} xl={16}>
          <Card size="small" title="活跃度（近一年）" loading={overviewQuery.isLoading}>
            <UserActivityHeatmap activity={overview?.activity ?? []} darkMode={darkMode} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card size="small" title="级别分布" loading={overviewQuery.isLoading}>
            <LevelDistributionColumns
              breakdown={overview?.breakdown_by_level ?? []}
              darkMode={darkMode}
            />
          </Card>
        </Col>
      </Row>
    </Flex>
  );
}
