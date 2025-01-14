import { useMemo } from "react";
import type { Schedule, TimeSlot, CategoryData, ProductivityStats } from "@/types/schedule";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Percent,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";

interface ProductivityDashboardProps {
  schedules: Schedule[];
  date: Date;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function ProductivityDashboard({ schedules, date }: ProductivityDashboardProps) {
  const timeSlotData = useMemo<TimeSlot[]>(() => {
    const slots: TimeSlot[] = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      duration: 0,
      completed: 0,
      pending: 0
    }));

    schedules.forEach(schedule => {
      const startHour = schedule.startTime.getHours();
      const endHour = schedule.endTime.getHours();
      const duration = differenceInMinutes(schedule.endTime, schedule.startTime);

      // 确保开始时间和结束时间在同一天内
      if (startHour <= endHour) {
        for (let hour = startHour; hour <= endHour; hour++) {
          if (slots[hour]) {
            const hourDuration = duration / (endHour - startHour + 1);
            slots[hour].duration += hourDuration;
            if (schedule.isDone) {
              slots[hour].completed += hourDuration;
            } else {
              slots[hour].pending += hourDuration;
            }
          }
        }
      }
    });

    // 只返回有数据的时间段
    return slots.filter(slot => slot.duration > 0);
  }, [schedules]);

  const completionStats = useMemo<ProductivityStats>(() => {
    const total = schedules.length;
    const completed = schedules.filter(s => s.isDone).length;
    const completion = total > 0 ? (completed / total) * 100 : 0;

    const totalDuration = schedules.reduce((acc, schedule) => 
      acc + differenceInMinutes(schedule.endTime, schedule.startTime), 0
    );
    const completedDuration = schedules
      .filter(s => s.isDone)
      .reduce((acc, schedule) => 
        acc + differenceInMinutes(schedule.endTime, schedule.startTime), 0
      );
    const durationCompletion = totalDuration > 0 
      ? (completedDuration / totalDuration) * 100 
      : 0;

    return {
      tasksTotal: total,
      tasksCompleted: completed,
      taskCompletion: completion,
      durationTotal: totalDuration,
      durationCompleted: completedDuration,
      durationCompletion: durationCompletion
    };
  }, [schedules]);

  const pieChartData = useMemo<CategoryData[]>(() => {
    const data: CategoryData[] = [
      {
        name: "已完成",
        value: Math.max(0, completionStats.durationCompleted),
        color: COLORS[0]
      },
      {
        name: "待完成",
        value: Math.max(0, completionStats.durationTotal - completionStats.durationCompleted),
        color: COLORS[1]
      }
    ];

    return data.filter(d => d.value > 0);
  }, [completionStats]);

  if (!schedules.length) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {/* 完成率卡片 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            今日完成率
          </CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {completionStats.taskCompletion.toFixed(1)}%
                </span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{completionStats.tasksCompleted}</span>
                  <span>/</span>
                  <span>{completionStats.tasksTotal}</span>
                  <span>项</span>
                </div>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, Math.max(0, completionStats.taskCompletion))}%` 
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">时间利用率</span>
                <span className="text-sm text-muted-foreground">
                  {completionStats.durationCompletion.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-primary/70 transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, Math.max(0, completionStats.durationCompletion))}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 时间分布图表 */}
      <Card className="col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">时间分布</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSlotData} barGap={0}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  scale="point" 
                  padding={{ left: 10, right: 10 }} 
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `${Math.round(value)}分钟`}
                  labelFormatter={(label: string) => `${label}`}
                />
                <Bar 
                  dataKey="completed" 
                  stackId="a" 
                  fill={COLORS[0]} 
                  name="已完成"
                />
                <Bar 
                  dataKey="pending" 
                  stackId="a" 
                  fill={COLORS[1]} 
                  name="待完成"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 饼图 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            任务完成占比
          </CardTitle>
          <PieChartIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip 
                  formatter={(value: number) => `${Math.round(value)}分钟`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}