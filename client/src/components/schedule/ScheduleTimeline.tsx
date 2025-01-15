import { useMemo, useRef, useCallback, useEffect } from "react";
import { Schedule } from "@/types/schedule";
import { ScheduleCard } from "./ScheduleCard";
import { TimeAxis } from "./TimeAxis";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Clock, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <Skeleton className="h-24 w-full rounded-lg bg-gradient-to-r from-orange-100/50 to-orange-50/50" />
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
  const timelineRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 640px)");

  const sortedSchedules = useMemo(
    () =>
      [...schedules].sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      ),
    [schedules]
  );

  // Calculate timeline height: each hour is 100px tall
  const totalHours = endHour - startHour + 1;
  const timelineHeight = totalHours * 100;

  // 滚动到当前时间
  const scrollToCurrentTime = useCallback(() => {
    if (!scrollRef.current) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    if (currentHour >= startHour && currentHour <= endHour) {
      const hourDiff = currentHour - startHour;
      const minuteOffset = (currentMinutes / 60) * 100;
      const scrollPosition = (hourDiff * 100) + minuteOffset - 200;

      scrollRef.current.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }
  }, [startHour, endHour]);

  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  // 组件加载时自动滚动到当前时间
  useEffect(() => {
    const timer = setTimeout(scrollToCurrentTime, 500);
    return () => clearTimeout(timer);
  }, [scrollToCurrentTime]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] rounded-lg overflow-hidden shadow-xl bg-white">
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
      "flex rounded-lg overflow-hidden shadow-xl bg-white",
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
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,237,213,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,237,213,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 100px, 20px 100px'
          }}
        />

        {/* 时间线内容区域 */}
        <div 
          ref={timelineRef}
          className="relative px-2 sm:px-4"
          style={{ height: `${timelineHeight}px` }}
        >
          {/* 当前时间指示器 */}
          <CurrentTimeIndicator startHour={startHour} />

          <AnimatePresence mode="popLayout">
            {sortedSchedules.map((schedule) => {
              const startHourDiff = schedule.startTime.getHours() - startHour;
              const startMinutes = schedule.startTime.getMinutes();
              const topPosition = (startHourDiff * 100) + ((startMinutes / 60) * 100);

              const durationMs = schedule.endTime.getTime() - schedule.startTime.getTime();
              const durationHours = durationMs / (1000 * 60 * 60);
              const height = Math.max(durationHours * 100, 60);

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

        {/* 固定按钮组 */}
        <div className="fixed bottom-4 right-4 space-y-2">
          {/* 滚动到顶部按钮 */}
          <Button
            size="icon"
            variant="secondary"
            className="shadow-lg"
            onClick={scrollToTop}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>

          {/* 滚动到当前时间按钮 */}
          <Button
            size="icon"
            className="shadow-lg"
            onClick={scrollToCurrentTime}
          >
            <Clock className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// 当前时间指示器组件
function CurrentTimeIndicator({ startHour }: { startHour: number }) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  const hourDiff = currentHour - startHour;
  const minuteOffset = (currentMinutes / 60) * 100;
  const topPosition = (hourDiff * 100) + minuteOffset;

  // 如果当前时间不在显示范围内，则不显示指示器
  if (hourDiff < 0) return null;

  return (
    <div 
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top: `${topPosition}px` }}
    >
      <div className="relative flex items-center">
        <div className="w-2 h-2 rounded-full bg-orange-500 shadow-lg" />
        <div className="flex-1 h-px bg-orange-500/50" />
      </div>
    </div>
  );
}