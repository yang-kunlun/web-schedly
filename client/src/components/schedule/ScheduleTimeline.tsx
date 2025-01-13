import { useMemo, useRef } from "react";
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
  startHour?: number;
  endHour?: number;
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
  startHour = 6,
  endHour = 22,
}: ScheduleTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedSchedules = useMemo(
    () =>
      [...schedules].sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      ),
    [schedules]
  );

  // Calculate timeline height: each hour is 80px tall
  const totalHours = endHour - startHour + 1; // Add 1 to include both start and end hours
  const timelineHeight = totalHours * 80; // 每小时80px高度

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] rounded-lg overflow-hidden shadow-xl">
        <TimeAxis startHour={startHour} endHour={endHour} />
        <div className="flex-1 p-4 space-y-4 bg-gradient-to-br from-orange-50/50 to-white/50 backdrop-blur-sm">
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
    <div className="flex h-[calc(100vh-12rem)] rounded-lg overflow-hidden shadow-xl">
      <TimeAxis startHour={startHour} endHour={endHour} />

      {/* 滚动容器 */}
      <div 
        ref={scrollRef}
        className="flex-1 relative overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-orange-200 hover:scrollbar-thumb-orange-300"
      >
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-white/50 backdrop-blur-md" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,237,213,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,237,213,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />

        {/* 时间线内容区域 */}
        <div 
          className="relative"
          style={{ height: `${timelineHeight}px` }}
        >
          <AnimatePresence mode="popLayout">
            {sortedSchedules.map((schedule) => {
              // 计算日程卡片的位置
              const startHourDiff = schedule.startTime.getHours() - startHour;
              const startMinutes = schedule.startTime.getMinutes();
              const topPosition = (startHourDiff * 80) + ((startMinutes / 60) * 80);

              // 计算日程持续时间（转换为小时）
              const durationMs = schedule.endTime.getTime() - schedule.startTime.getTime();
              const durationHours = durationMs / (1000 * 60 * 60);
              const height = Math.max(durationHours * 80, 40); // 最小高度40px

              return (
                <motion.div
                  key={schedule.id}
                  style={{
                    position: 'absolute',
                    top: `${topPosition}px`,
                    left: '1rem',
                    right: '1rem',
                    height: `${height}px`,
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
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
    </div>
  );
}

function getMarginTop(time: Date, startHour: number): number {
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const hourDiff = Math.max(0, hours - startHour); // 确保不会出现负值
  const minuteOffset = (minutes / 60) * 80;
  return hourDiff * 80 + minuteOffset;
}

function getDurationInHours(startTime: Date, endTime: Date): number {
  const diff = endTime.getTime() - startTime.getTime();
  return Math.max(diff / (1000 * 60 * 60), 0.5); // 最小duration为30分钟
}