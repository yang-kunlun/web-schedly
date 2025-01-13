import { ResponsiveContainer, Tooltip, RechartTooltipProps } from "recharts";
import { Schedule } from "@/types/schedule";
import { format, eachDayOfInterval, startOfWeek, endOfWeek, isEqual, isSameMonth } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HeatmapViewProps {
  schedules: Schedule[];
  currentDate: Date;
}

export function HeatmapView({ schedules, currentDate }: HeatmapViewProps) {
  const startDate = startOfWeek(currentDate, { locale: zhCN });
  const endDate = endOfWeek(currentDate, { locale: zhCN });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Count schedules for each day
  const scheduleCounts = days.map(day => {
    const count = schedules.filter(schedule => 
      isEqual(new Date(schedule.startTime).setHours(0,0,0,0), day.setHours(0,0,0,0))
    ).length;
    return { day, count };
  });

  const maxCount = Math.max(...scheduleCounts.map(d => d.count));
  const getIntensity = (count: number) => {
    if (count === 0) return "bg-gray-100";
    const intensity = Math.ceil((count / maxCount) * 4);
    switch (intensity) {
      case 1: return "bg-orange-100";
      case 2: return "bg-orange-200";
      case 3: return "bg-orange-300";
      case 4: return "bg-orange-400";
      default: return "bg-gray-100";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">本周日程活跃度</h3>
        <p className="text-sm text-gray-500">深色表示日程较多的日子</p>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {scheduleCounts.map(({ day, count }) => (
          <Card
            key={day.toString()}
            className={cn(
              "aspect-square flex flex-col items-center justify-center p-2 transition-colors",
              getIntensity(count),
              isEqual(day.setHours(0,0,0,0), currentDate.setHours(0,0,0,0)) && "ring-2 ring-orange-500",
              !isSameMonth(day, currentDate) && "opacity-50"
            )}
          >
            <span className="text-sm font-medium">{format(day, "d")}</span>
            <span className="text-xs text-gray-500">{count} 项</span>
          </Card>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {[0, 1, 2, 3, 4].map(level => (
          <div key={level} className="flex items-center gap-1">
            <div
              className={cn(
                "w-4 h-4 rounded",
                level === 0 ? "bg-gray-100" : `bg-orange-${level}00`
              )}
            />
            <span className="text-xs text-gray-500">
              {level === 0 ? "无" : `${level}+`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
