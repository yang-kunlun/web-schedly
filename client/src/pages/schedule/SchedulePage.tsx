import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DateHeader } from "@/components/schedule/DateHeader";
import { ScheduleTimeline } from "@/components/schedule/ScheduleTimeline";
import { NewScheduleDialog } from "@/components/schedule/NewScheduleDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Schedule } from "@/types/schedule";
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from "@/lib/api";
import { startOfWeek, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function SchedulePage() {
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
        <motion.h1 
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent"
        >
          卡片计划 Schedly
        </motion.h1>
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
          <ScheduleTimeline
            schedules={schedules}
            onEdit={setEditingSchedule}
            onDelete={deleteMutation.mutate}
            onToggleStatus={(id, isDone) =>
              updateMutation.mutate({ id, data: { isDone } })
            }
            isLoading={isLoading}
          />

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              className="fixed bottom-8 right-8 shadow-lg"
              size="lg"
              onClick={() => setIsNewScheduleOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> New Schedule
            </Button>
          </motion.div>

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