import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Schedule } from "@/types/schedule";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface ImportanceChartProps {
  schedules: Schedule[];
}

const PRIORITY_COLORS = {
  high: "#ef4444",
  normal: "#3b82f6",
  low: "#22c55e",
};

export function ImportanceChart({ schedules }: ImportanceChartProps) {
  // 计算按优先级分组的统计数据
  const priorityStats = useMemo(() => {
    const stats = {
      high: { total: 0, completed: 0 },
      normal: { total: 0, completed: 0 },
      low: { total: 0, completed: 0 },
    };

    schedules.forEach((schedule) => {
      const priority = schedule.priority || "normal";
      stats[priority].total += 1;
      if (schedule.isDone) {
        stats[priority].completed += 1;
      }
    });

    return Object.entries(stats).map(([priority, data]) => ({
      name: priority === "high" ? "高优先级" : priority === "normal" ? "普通优先级" : "低优先级",
      total: data.total,
      completed: data.completed,
      completion: data.total ? Math.round((data.completed / data.total) * 100) : 0,
    }));
  }, [schedules]);

  // 计算时间分布数据
  const timeDistribution = useMemo(() => {
    const distribution = new Map<string, { high: number; normal: number; low: number }>();
    
    schedules.forEach((schedule) => {
      const hour = format(schedule.startTime, "HH:00", { locale: zhCN });
      const priority = schedule.priority || "normal";
      
      if (!distribution.has(hour)) {
        distribution.set(hour, { high: 0, normal: 0, low: 0 });
      }
      
      const hourData = distribution.get(hour)!;
      hourData[priority]++;
    });

    return Array.from(distribution.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, data]) => ({
        hour,
        ...data,
      }));
  }, [schedules]);

  // 计算完成率数据
  const completionData = useMemo(() => {
    return priorityStats.map((stat) => ({
      name: stat.name,
      value: stat.total,
      completion: stat.completion,
    }));
  }, [priorityStats]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">重要性分析</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="distribution" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="distribution">优先级分布</TabsTrigger>
            <TabsTrigger value="timeline">时间分布</TabsTrigger>
            <TabsTrigger value="completion">完成情况</TabsTrigger>
          </TabsList>

          <TabsContent value="distribution" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="总数" fill="#94a3b8" />
                <Bar dataKey="completed" name="已完成" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="timeline" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="high" name="高优先级" fill={PRIORITY_COLORS.high} stackId="a" />
                <Bar dataKey="normal" name="普通优先级" fill={PRIORITY_COLORS.normal} stackId="a" />
                <Bar dataKey="low" name="低优先级" fill={PRIORITY_COLORS.low} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="completion" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, completion }) => `${name} (${completion}%)`}
                >
                  {completionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name.includes("高")
                          ? PRIORITY_COLORS.high
                          : entry.name.includes("普通")
                          ? PRIORITY_COLORS.normal
                          : PRIORITY_COLORS.low
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
