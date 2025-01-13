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

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNewScheduleOpen, setIsNewScheduleOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfWeek(currentDate), i)
  );

  const { data: schedules = [] } = useQuery({
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
    setEditingSchedule(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3">
        <h1 className="text-2xl font-bold text-orange-600">卡片计划 Schedly</h1>
      </header>

      <DateHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        weekDays={weekDays}
        onSelectDay={setCurrentDate}
      />

      <main className="container mx-auto py-4">
        <ScheduleTimeline
          schedules={schedules}
          onEdit={setEditingSchedule}
          onDelete={deleteMutation.mutate}
          onToggleStatus={(id, isDone) =>
            updateMutation.mutate({ id, data: { isDone } })
          }
        />

        <Button
          className="fixed bottom-8 right-8"
          size="lg"
          onClick={() => setIsNewScheduleOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> New Schedule
        </Button>

        <NewScheduleDialog
          schedule={editingSchedule}
          isOpen={isNewScheduleOpen || !!editingSchedule}
          onClose={() => {
            setIsNewScheduleOpen(false);
            setEditingSchedule(undefined);
          }}
          onSave={handleSaveSchedule}
        />
      </main>
    </div>
  );
}
