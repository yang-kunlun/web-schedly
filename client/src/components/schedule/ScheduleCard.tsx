import { Schedule } from "@/types/schedule";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { CheckCircle, Circle, Clock, MapPin, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ScheduleCardProps {
  schedule: Schedule;
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number, isDone: boolean) => void;
}

export function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onToggleStatus,
}: ScheduleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isOngoing =
    !schedule.isDone &&
    new Date() >= schedule.startTime &&
    new Date() <= schedule.endTime;

  return (
    <Card
      className={cn(
        "w-full transition-all duration-200 hover:shadow-md",
        isOngoing && "bg-gradient-to-r from-orange-100 to-orange-50",
        schedule.isDone && "opacity-75"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div
            className="flex-1 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus(schedule.id, !schedule.isDone);
                }}
                className="text-orange-500 hover:text-orange-600"
              >
                {schedule.isDone ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </button>
              <h3
                className={cn(
                  "text-lg font-semibold",
                  schedule.isDone && "line-through"
                )}
              >
                {schedule.title}
              </h3>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>
                {format(schedule.startTime, "HH:mm")} -{" "}
                {format(schedule.endTime, "HH:mm")}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(schedule)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(schedule.id)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-2">
            {schedule.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{schedule.location}</span>
              </div>
            )}
            {schedule.remarks && (
              <p className="text-sm text-gray-600">{schedule.remarks}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
