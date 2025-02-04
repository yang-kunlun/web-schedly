import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DateHeader } from "@/components/schedule/DateHeader";
import { NewScheduleDialog } from "@/components/schedule/NewScheduleDialog";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { Schedule } from "@/types/schedule";
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from "@/lib/api";
import { startOfWeek, addDays, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ProductivityAdvice } from "@/components/schedule/ProductivityAdvice";
import { ThemeSettings } from "@/components/schedule/ThemeSettings";
import { ProductivityDashboard } from "@/components/schedule/ProductivityDashboard";
import { ScheduleList } from "@/components/schedule/ScheduleList";
import { ScheduleRecommendations } from "@/components/schedule/ScheduleRecommendations";
import { ImportanceChart } from "@/components/schedule/ImportanceChart";
import { useNotifications } from "@/hooks/use-notifications";
import { useSync } from "@/hooks/useSync";
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
        className="fixed bottom-8 right-8 shadow-lg bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300"
        size="lg"
        onClick={onClick}
      >
        <Plus className="mr-2 h-4 w-4" /> 新建日程
      </Button>
    </motion.div>
  );
}

function SyncStatus({ isConnected, lastSyncTime }: { isConnected: boolean; lastSyncTime: Date | null }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span>{isConnected ? '已连接' : '未连接'}</span>
      {lastSyncTime && (
        <span className="text-gray-400">
          上次同步: {lastSyncTime.toLocaleTimeString()}
        </span>
      )}
      <RefreshCw
        className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-red-500'} ${isConnected && 'animate-spin'}`}
      />
    </div>
  );
}

export default function SchedulePage() {
  useNotifications();
  const { isConnected, lastSyncTime } = useSync();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNewScheduleOpen, setIsNewScheduleOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentDate), i)),
    [currentDate]
  );

  // 更新查询键以包含格式化的日期
  const queryKey = useMemo(() =>
    ["/api/schedules", format(currentDate, "yyyy-MM-dd")],
    [currentDate]
  );

  const { data: schedules = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getSchedules(currentDate),
    staleTime: 0, // 确保数据始终重新获取
  });

  const sortedSchedules = useMemo(() =>
    [...schedules].sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal'];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    }),
    [schedules]
  );

  const createMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: () => {
      // 使所有相关查询缓存失效，包括当前日期的查询
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: queryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/advice"] });

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
      queryClient.invalidateQueries({ queryKey: queryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/advice"] });

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
      queryClient.invalidateQueries({ queryKey: queryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/advice"] });

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

  // 更新日期选择处理函数
  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    // 手动触发数据重新获取
    queryClient.invalidateQueries({ queryKey: ["/api/schedules", format(date, "yyyy-MM-dd")] });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-orange-50 to-white"
    >
      {/* 顶部导航栏 */}
      <header className="bg-white border-b px-6 py-4 shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <motion.h1
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent"
            >
              卡片计划 Schedly
            </motion.h1>
            <SyncStatus isConnected={isConnected} lastSyncTime={lastSyncTime} />
          </div>
          <ThemeSettings />
        </div>
      </header>

      {/* 日期选择器 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto">
          <DateHeader
            currentDate={currentDate}
            onDateChange={handleDateSelect}
            weekDays={weekDays}
            onSelectDay={handleDateSelect}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.main
          key={currentDate.toISOString()}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="container mx-auto py-6 px-4 max-w-7xl"
        >
          {/* 主要日程列表部分 */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
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
          <div className="grid gap-6 lg:grid-cols-3">
            {/* 左侧和中间列 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 重要性图表和热力图 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-lg shadow-sm"
                >
                  <ImportanceChart schedules={schedules} />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-lg shadow-sm"
                >
                  <HeatmapView
                    schedules={schedules}
                    currentDate={currentDate}
                    onDateSelect={handleDateSelect}
                  />
                </motion.div>
              </div>

              {/* 生产力仪表板 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg shadow-sm"
              >
                <ProductivityDashboard
                  schedules={schedules}
                  date={currentDate}
                />
              </motion.div>

              {/* 生产力建议 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-lg shadow-sm"
              >
                <ProductivityAdvice date={currentDate} />
              </motion.div>
            </div>

            {/* 右侧边栏 */}
            <div className="space-y-6">
              {/* 日历视图 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow-sm"
              >
                <CalendarView
                  schedules={schedules}
                  onDateSelect={handleDateSelect}
                  selectedDate={currentDate}
                />
              </motion.div>

              {/* 日程推荐 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg shadow-sm"
              >
                <ScheduleRecommendations
                  date={currentDate}
                  onSelectRecommendation={(recommendation) => {
                    setEditingSchedule(undefined);
                    setIsNewScheduleOpen(true);
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
              </motion.div>
            </div>
          </div>

          {/* 新建日程按钮和对话框 */}
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