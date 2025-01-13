import { useEffect, useMemo } from "react";
import { Schedule } from "@/types/schedule";
import { ScheduleCard } from "./ScheduleCard";
import { TimeAxis } from "./TimeAxis";

interface ScheduleTimelineProps {
  schedules: Schedule[];
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number, isDone: boolean) => void;
}

export function ScheduleTimeline({
  schedules,
  onEdit,
  onDelete,
  onToggleStatus,
}: ScheduleTimelineProps) {
  const sortedSchedules = useMemo(
    () =>
      [...schedules].sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      ),
    [schedules]
  );

  return (
    <div className="flex h-[calc(100vh-12rem)] overflow-auto">
      <TimeAxis />
      <div className="flex-1 p-4 space-y-4">
        {sortedSchedules.map((schedule) => (
          <div
            key={schedule.id}
            style={{
              marginTop: `${getMarginTop(schedule.startTime)}px`,
            }}
          >
            <ScheduleCard
              schedule={schedule}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function getMarginTop(time: Date): number {
  const minutes = time.getHours() * 60 + time.getMinutes();
  return (minutes / 60) * 80; // 80px is the height of each hour slot
}
