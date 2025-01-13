import { useEffect, useMemo } from "react";
import { Schedule } from "@/types/schedule";
import { ScheduleCard } from "./ScheduleCard";
import { TimeAxis } from "./TimeAxis";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface ScheduleTimelineProps {
  schedules: Schedule[];
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number, isDone: boolean) => void;
  isLoading?: boolean;
}

function ScheduleCardSkeleton() {
  return (
    <div className="w-full">
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

export function ScheduleTimeline({
  schedules,
  onEdit,
  onDelete,
  onToggleStatus,
  isLoading,
}: ScheduleTimelineProps) {
  const sortedSchedules = useMemo(
    () =>
      [...schedules].sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      ),
    [schedules]
  );

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] overflow-auto">
        <TimeAxis />
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ScheduleCardSkeleton />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] overflow-auto">
      <TimeAxis />
      <div className="flex-1 p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {sortedSchedules.map((schedule) => (
            <motion.div
              key={schedule.id}
              style={{
                marginTop: `${getMarginTop(schedule.startTime)}px`,
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              layout
            >
              <ScheduleCard
                schedule={schedule}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleStatus={onToggleStatus}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function getMarginTop(time: Date): number {
  const minutes = time.getHours() * 60 + time.getMinutes();
  return (minutes / 60) * 80; // 80px is the height of each hour slot
}