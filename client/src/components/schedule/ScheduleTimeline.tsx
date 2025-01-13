import { useMemo, useRef } from "react";
import { Schedule } from "@/types/schedule";
import { ScheduleCard } from "./ScheduleCard";
import { TimeAxis } from "./TimeAxis";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useScroll, useSpring } from "framer-motion";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });
  const y = useSpring(scrollY, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

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
        <TimeAxis className="flex-shrink-0" />
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
    <div 
      ref={scrollRef}
      className="flex h-[calc(100vh-12rem)] overflow-auto scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-transparent"
    >
      <TimeAxis className="flex-shrink-0" />
      <div className="flex-1 relative">
        <AnimatePresence mode="popLayout">
          {sortedSchedules.map((schedule, index) => {
            const topPosition = getMarginTop(schedule.startTime);
            return (
              <motion.div
                key={schedule.id}
                style={{
                  position: 'absolute',
                  top: topPosition,
                  left: 16,
                  right: 16,
                  y,
                }}
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                transition={{ 
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  mass: 1,
                  delay: index * 0.05,
                }}
                layout="position"
              >
                <ScheduleCard
                  schedule={schedule}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleStatus={onToggleStatus}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function getMarginTop(time: Date): number {
  const hours = time.getHours();
  const minutes = time.getMinutes();
  return (hours * 80) + ((minutes / 60) * 80); // 80px per hour
}