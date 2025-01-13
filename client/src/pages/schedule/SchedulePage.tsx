import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DateHeader } from "@/components/schedule/DateHeader";
import { ScheduleTimeline } from "@/components/schedule/ScheduleTimeline";
import { HeatmapView } from "@/components/schedule/HeatmapView";
import { NewScheduleDialog } from "@/components/schedule/NewScheduleDialog";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, BarChart2 } from "lucide-react";
import { Schedule } from "@/types/schedule";
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from "@/lib/api";
import { startOfWeek, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type ViewMode = "timeline" | "heatmap";

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
        <Plus className="mr-2 h-4 w-4" /> New Schedule
      </Button>
    </motion.div>
  );
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNewScheduleOpen, setIsNewScheduleOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [startHour, setStartHour] = useState(6);
  const [endHour, setEndHour] = useState(22);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfWeek(currentDate), i)
  );

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["/api/schedules", currentDate.toISOString()],
    queryFn: () => getSchedules(currentDate),
  });

  // 生成默认的起床和睡觉日程
  const defaultSchedules = useMemo(() => {
    const wakeUpTime = new Date(currentDate);
    wakeUpTime.setHours(startHour, 0, 0, 0);

    const sleepTime = new Date(currentDate);
    sleepTime.setHours(endHour, 0, 0, 0);

    const defaultItems: Schedule[] = [
      {
        id: -1,
        title: "起床了",
        startTime: wakeUpTime,
        endTime: new Date(wakeUpTime.getTime() + 30 * 60000), // 30分钟后
        isDone: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        icon: "sun",
      },
      {
        id: -2,
        title: "睡觉时间",
        startTime: sleepTime,
        endTime: new Date(sleepTime.getTime() + 30 * 60000),
        isDone: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        icon: "moon",
      },
    ];

    // 只有当用户没有在这个时间段内的日程时，才显示默认日程
    return defaultItems.filter(defaultItem => 
      !schedules.some(schedule => 
        Math.abs(schedule.startTime.getTime() - defaultItem.startTime.getTime()) < 30 * 60000
      )
    );
  }, [schedules, currentDate, startHour, endHour]);

  const allSchedules = useMemo(() => 
    [...schedules, ...defaultSchedules].sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    ), 
    [schedules, defaultSchedules]
  );

  const createMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Schedule created",
        description: "Your schedule has been created successfully.",
      });
      setIsNewScheduleOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create schedule",
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
        title: "Schedule updated",
        description: "Your schedule has been updated successfully.",
      });
      setEditingSchedule(undefined);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update schedule",
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
        title: "Schedule deleted",
        description: "Your schedule has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete schedule",
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
          <div className="flex gap-2">
            <Button
              variant={viewMode === "timeline" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("timeline")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              时间线
            </Button>
            <Button
              variant={viewMode === "heatmap" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("heatmap")}
            >
              <BarChart2 className="h-4 w-4 mr-2" />
              热力图
            </Button>
          </div>
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
          key={`${viewMode}-${currentDate.toISOString()}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="container mx-auto py-6 px-4"
        >
          {viewMode === "timeline" ? (
            <ScheduleTimeline
              schedules={allSchedules}
              onEdit={schedule => {
                if (schedule.id > 0) setEditingSchedule(schedule);
              }}
              onDelete={id => {
                if (id > 0) deleteMutation.mutate(id);
              }}
              onToggleStatus={(id, isDone) => {
                if (id > 0) updateMutation.mutate({ id, data: { isDone } });
              }}
              isLoading={isLoading}
              startHour={startHour}
              endHour={endHour}
            />
          ) : (
            <HeatmapView
              schedules={schedules}
              currentDate={currentDate}
            />
          )}

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