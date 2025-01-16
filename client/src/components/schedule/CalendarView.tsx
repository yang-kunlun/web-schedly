import { useState } from "react";
import { DayPicker, type DayProps } from "react-day-picker";
import { zhCN } from 'date-fns/locale';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Schedule } from "@/types/schedule";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";

interface CalendarViewProps {
  schedules: Schedule[];
  onDateSelect?: (date: Date) => void;
}

type ViewMode = "week" | "month" | "year";

export function CalendarView({ schedules, onDateSelect }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // 根据视图模式获取日期范围
  const getDateRange = (date: Date, mode: ViewMode) => {
    switch (mode) {
      case "week":
        return {
          from: startOfWeek(date, { locale: zhCN }),
          to: endOfWeek(date, { locale: zhCN })
        };
      case "month":
        return {
          from: startOfMonth(date),
          to: endOfMonth(date)
        };
      case "year":
        return {
          from: startOfYear(date),
          to: endOfYear(date)
        };
    }
  };

  // 获取某一天的日程
  const getDaySchedules = (date: Date) => {
    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.startTime);
      return format(scheduleDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
  };

  // 自定义日期渲染
  const renderDay = (date: Date) => {
    const daySchedules = getDaySchedules(date);
    if (!daySchedules.length) return null;

    const completedCount = daySchedules.filter(s => s.isDone).length;
    const totalCount = daySchedules.length;
    const allCompleted = completedCount === totalCount;
    const hasIncomplete = completedCount < totalCount;

    return (
      <div className="relative w-full h-full">
        <div className="absolute bottom-0 right-0 flex items-center gap-1">
          {allCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : hasIncomplete ? (
            <Clock className="h-4 w-4 text-orange-500" />
          ) : null}
          {totalCount > 1 && (
            <span className="text-xs text-gray-500">{totalCount}</span>
          )}
        </div>
      </div>
    );
  };

  // 日期选择处理
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateSelect?.(date);
    }
  };

  const dateRange = getDateRange(selectedDate, viewMode);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">日程日历</CardTitle>
        <Select
          value={viewMode}
          onValueChange={(value) => setViewMode(value as ViewMode)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">
              <div className="flex items-center">
                <CalendarDays className="mr-2 h-4 w-4" />
                周视图
              </div>
            </SelectItem>
            <SelectItem value="month">
              <div className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                月视图
              </div>
            </SelectItem>
            <SelectItem value="year">
              <div className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                年视图
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              locale={zhCN}
              showOutsideDays
              components={{
                Day: ({ date, ...props }: DayProps) => (
                  <div
                    className={cn(
                      "relative w-9 h-9 p-0",
                      props.selected && "bg-orange-500 text-white rounded-lg",
                      !props.selected && props.isToday && "bg-orange-100 rounded-lg"
                    )}
                    {...props}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      {format(date, "d")}
                    </div>
                    {renderDay(date)}
                  </div>
                ),
              }}
              fromDate={dateRange.from}
              toDate={dateRange.to}
              defaultMonth={selectedDate}
              footer={
                <div className="mt-4 text-sm text-gray-500 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>全部完成</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span>部分完成/待办</span>
                  </div>
                </div>
              }
            />
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}