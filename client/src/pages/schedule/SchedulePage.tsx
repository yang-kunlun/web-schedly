import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DateHeader } from "@/components/schedule/DateHeader";
import { NewScheduleDialog } from "@/components/schedule/NewScheduleDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Schedule } from "@/types/schedule";
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from "@/lib/api";
import { startOfWeek, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ProductivityAdvice } from "@/components/schedule/ProductivityAdvice";
import { ThemeSettings } from "@/components/schedule/ThemeSettings";
import { ProductivityDashboard } from "@/components/schedule/ProductivityDashboard";
import { ScheduleList } from "@/components/schedule/ScheduleList";
import { ScheduleRecommendations } from "@/components/schedule/ScheduleRecommendations";
import { ImportanceChart } from "@/components/schedule/ImportanceChart";
import { useNotifications } from "@/hooks/use-notifications";
import { CalendarView } from "@/components/schedule/CalendarView";
import { HeatmapView } from "@/components/schedule/HeatmapView";

function NewScheduleButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
    >
      <Button
        className="fixed bottom-8 right-8 shadow-lg"
        size="lg"
        onClick={onClick}
      >
        <Plus className="mr-2 h-4 w-4" /> 新建日程
      </Button>
    </motion.div>
  );
}

export default function SchedulePage() {
  // 启用实时通知
  useNotifications();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNewScheduleOpen, setIsNewScheduleOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfWeek(currentDate), i)
  );

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["/api/schedules", currentDate.toISOString()],
    queryFn: () => getSchedules(currentDate),
  });

  // 按优先级和开始时间对日程进行排序
  const sortedSchedules = useMemo(() =>
    [...schedules].sort((a, b) => {
      // 首先按优先级排序
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal'];
      if (priorityDiff !== 0) return priorityDiff;

      // 其次按开始时间排序
      return a.startTime.getTime() - b.startTime.getTime();
    }),
    [schedules]
  );

  const createMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "日程创建成功",
        description: "您的日程已成功创建并自动进行了优先级分析。",
      });
      setIsNewScheduleOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "创建失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Schedule> }) =>
      updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "日程更新成功",
        description: "您的日程已成功更新，优先级已重新分析。",
      });
      setEditingSchedule(undefined);
    },
    onError: (error: Error) => {
      toast({
        title: "更新失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "日程删除成功",
        description: "您的日程已成功删除。",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveSchedule = (scheduleData: Partial<Schedule>) => {
    if (editingSchedule) {
      updateMutation.mutate({
        id: editingSchedule.id,
        data: scheduleData,
      });
    } else {
      createMutation.mutate(scheduleData as Omit<Schedule, "id" | "createdAt" | "updatedAt">);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-orange-50 to-white"
    >
      <header className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <motion.h1
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent"
          >
            卡片计划 Schedly
          </motion.h1>
          <ThemeSettings />
        </div>
      </header>

      <DateHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        weekDays={weekDays}
        onSelectDay={setCurrentDate}
      />

      <AnimatePresence mode="wait">
        <motion.main
          key={currentDate.toISOString()}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="container mx-auto py-6 px-4"
        >
          {/* 主要日程列表部分 */}
          <div className="mb-8">
            <ScheduleList
              schedules={sortedSchedules}
              isLoading={isLoading}
              onEdit={setEditingSchedule}
              onDelete={(id: number) => deleteMutation.mutate(id)}
              onToggleStatus={(id: number, isDone: boolean) =>
                updateMutation.mutate({ id, data: { isDone } })
              }
            />
          </div>

          {/* 分析和可视化部分 */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-6 md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ImportanceChart schedules={schedules} />
                <HeatmapView schedules={schedules} currentDate={currentDate} />
              </div>
              <ProductivityDashboard
                schedules={schedules}
                date={currentDate}
              />
              <ProductivityAdvice date={currentDate} />
            </div>
            <div className="space-y-6">
              <CalendarView
                schedules={schedules}
                onDateSelect={setCurrentDate}
              />
              <ScheduleRecommendations
                date={currentDate}
                onSelectRecommendation={(recommendation) => {
                  setEditingSchedule(undefined);
                  setIsNewScheduleOpen(true);
                  // 预填充推荐的日程信息
                  const newSchedule: Partial<Schedule> = {
                    title: recommendation.title,
                    startTime: new Date(recommendation.suggestedStartTime),
                    endTime: new Date(recommendation.suggestedEndTime),
                    priority: recommendation.priority,
                    remarks: recommendation.reasoning,
                  };
                  handleSaveSchedule(newSchedule);
                }}
              />
            </div>
          </div>

          <NewScheduleButton onClick={() => setIsNewScheduleOpen(true)} />

          <NewScheduleDialog
            schedule={editingSchedule}
            isOpen={isNewScheduleOpen || !!editingSchedule}
            onClose={() => {
              setIsNewScheduleOpen(false);
              setEditingSchedule(undefined);
            }}
            onSave={handleSaveSchedule}
          />
        </motion.main>
      </AnimatePresence>
    </motion.div>
  );
}