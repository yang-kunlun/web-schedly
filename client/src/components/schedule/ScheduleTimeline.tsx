import { useMemo, useRef, useCallback, useEffect } from "react";
import { Schedule } from "@/types/schedule";
import { ScheduleCard } from "./ScheduleCard";
import { TimeAxis } from "./TimeAxis";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

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
  const isMobile = useMediaQuery("(max-width: 640px)");

  const sortedSchedules = useMemo(
    () =>
      [...schedules].sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      ),
    [schedules]
  );

  // Calculate timeline height: each hour is 80px tall
  const totalHours = endHour - startHour + 1; // Add 1 to include both start and end hours
  const timelineHeight = totalHours * 80;

  // 滚动到当前时间
  const scrollToCurrentTime = useCallback(() => {
    if (!scrollRef.current) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    if (currentHour >= startHour && currentHour <= endHour) {
      const hourDiff = currentHour - startHour;
      const minuteOffset = (currentMinutes / 60) * 80;
      const scrollPosition = (hourDiff * 80) + minuteOffset - 200; // 200px offset for better viewing

      scrollRef.current.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }
  }, [startHour, endHour]);

  // 当组件加载时自动滚动到当前时间
  useEffect(() => {
    const timer = setTimeout(scrollToCurrentTime, 500); // 延迟滚动以确保组件完全渲染
    return () => clearTimeout(timer);
  }, [scrollToCurrentTime]);

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
    <div className={cn(
      "flex rounded-lg overflow-hidden shadow-xl",
      "h-[calc(100vh-12rem)]",
      "transition-all duration-300 ease-in-out"
    )}>
      <TimeAxis startHour={startHour} endHour={endHour} />

      {/* 滚动容器 */}
      <div 
        ref={scrollRef}
        className={cn(
          "flex-1 relative overflow-y-auto",
          "scrollbar-thin scrollbar-track-transparent",
          "scrollbar-thumb-orange-200 hover:scrollbar-thumb-orange-300",
          "touch-pan-y"
        )}
      >
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-white/50 backdrop-blur-md" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,237,213,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,237,213,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />

        {/* 时间线内容区域 */}
        <div 
          className="relative px-2 sm:px-4"
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
              const height = Math.max(durationHours * 80, 48); // 最小高度48px

              return (
                <motion.div
                  key={schedule.id}
                  style={{
                    position: 'absolute',
                    top: `${topPosition}px`,
                    left: 0,
                    right: 0,
                    height: `${height}px`,
                    padding: isMobile ? '0 0.5rem' : '0 1rem',
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

        {/* 固定在底部的滚动到当前时间按钮 */}
        <motion.button
          className={cn(
            "fixed bottom-4 right-4 z-10",
            "bg-orange-500 text-white",
            "rounded-full px-4 py-2",
            "shadow-lg flex items-center gap-2",
            "hover:bg-orange-600 transition-colors",
            "sm:hidden" // 在桌面端隐藏
          )}
          onClick={scrollToCurrentTime}
          whileTap={{ scale: 0.95 }}
        >
          <Clock className="w-4 h-4" />
          <span>现在</span>
        </motion.button>
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