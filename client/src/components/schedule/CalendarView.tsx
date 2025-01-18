import { useState } from "react";
import { DayPicker } from "react-day-picker";
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
  selectedDate?: Date;
}

type ViewMode = "week" | "month" | "year";

export function CalendarView({ schedules, onDateSelect, selectedDate }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate || new Date());

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
  const renderDay = (props: { date: Date; selected: boolean; disabled: boolean }) => {
    const { date, selected, disabled } = props;
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
      setCurrentDate(date);
      onDateSelect?.(date);
    }
  };

  const dateRange = getDateRange(currentDate, viewMode);

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
              selected={currentDate}
              onSelect={handleDateSelect}
              locale={zhCN}
              showOutsideDays
              modifiers={{
                selected: (date) => format(currentDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
              }}
              modifiersStyles={{
                selected: { backgroundColor: 'rgb(249, 115, 22)', color: 'white', borderRadius: '0.5rem' }
              }}
              components={{
                Day: ({ date, selected, disabled }) => (
                  <div
                    className={cn(
                      "relative w-9 h-9 p-0",
                      selected && "bg-orange-500 text-white rounded-lg",
                      !selected && date.getDate() === new Date().getDate() && 
                      date.getMonth() === new Date().getMonth() && 
                      date.getFullYear() === new Date().getFullYear() && 
                      "bg-orange-100 rounded-lg"
                    )}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      {format(date, "d")}
                    </div>
                    {renderDay({ date, selected, disabled })}
                  </div>
                ),
              }}
              fromDate={dateRange.from}
              toDate={dateRange.to}
              defaultMonth={currentDate}
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