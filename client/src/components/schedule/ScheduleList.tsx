import { Schedule } from "@/types/schedule";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ArrowUp, ArrowRight, ArrowDown, Clock, MapPin, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface ScheduleListProps {
  schedules: Schedule[];
  isLoading?: boolean;
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number, isDone: boolean) => void;
  onReorder?: (sourceIndex: number, destinationIndex: number, priority: string) => void;
}

const priorityConfig = {
  high: {
    label: "高优先级",
    icon: ArrowUp,
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200"
  },
  normal: {
    label: "普通优先级",
    icon: ArrowRight,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  low: {
    label: "低优先级",
    icon: ArrowDown,
    color: "text-green-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  }
};

function ScheduleCardSkeleton() {
  return (
    <div className="w-full">
      <Skeleton className="h-24 w-full rounded-lg bg-gradient-to-r from-orange-100/50 to-orange-50/50" />
    </div>
  );
}

export function ScheduleList({
  schedules,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
  onReorder
}: ScheduleListProps) {
  // 按优先级对日程进行分组
  const groupedSchedules = schedules.reduce((groups, schedule) => {
    const priority = schedule.priority || 'normal';
    if (!groups[priority]) {
      groups[priority] = [];
    }
    groups[priority].push(schedule);
    return groups;
  }, {} as Record<string, Schedule[]>);

  const handleDragEnd = (result: any) => {
    if (!result.destination || !onReorder) return;

    const [priority] = result.draggableId.split('-');
    onReorder(
      result.source.index,
      result.destination.index,
      priority
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
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
    );
  }

  if (!schedules.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12 text-gray-500"
      >
        暂无日程安排
      </motion.div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {Object.entries(priorityConfig).map(([priority, config]) => {
          const prioritySchedules = groupedSchedules[priority] || [];
          if (!prioritySchedules.length) return null;

          const Icon = config.icon;

          return (
            <motion.div
              key={priority}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("h-5 w-5", config.color)} />
                <h3 className="font-medium">{config.label}</h3>
                <Badge variant="outline" className={cn(config.color)}>
                  {prioritySchedules.length}
                </Badge>
              </div>

              <Droppable droppableId={priority}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
                    <AnimatePresence mode="popLayout">
                      {prioritySchedules.map((schedule, index) => (
                        <Draggable
                          key={schedule.id}
                          draggableId={`${priority}-${schedule.id}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <motion.div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30
                              }}
                              style={{
                                ...provided.draggableProps.style,
                              }}
                            >
                              <Card
                                className={cn(
                                  "p-4 hover:shadow-md transition-shadow",
                                  schedule.isDone && "opacity-60",
                                  config.bgColor,
                                  config.borderColor,
                                  snapshot.isDragging && "shadow-lg scale-[1.02] z-50",
                                  "group"
                                )}
                                onClick={() => onEdit(schedule)}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                      <GripVertical className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      <h4 className={cn(
                                        "font-medium",
                                        schedule.isDone && "line-through"
                                      )}>
                                        {schedule.title}
                                      </h4>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={schedule.isDone}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        onToggleStatus(schedule.id, e.target.checked);
                                      }}
                                      className="ml-4"
                                    />
                                  </div>

                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      <span>
                                        {format(schedule.startTime, "HH:mm", { locale: zhCN })}
                                        {" - "}
                                        {format(schedule.endTime, "HH:mm", { locale: zhCN })}
                                      </span>
                                    </div>
                                    {schedule.location && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        <span>{schedule.location}</span>
                                      </div>
                                    )}
                                  </div>

                                  {schedule.remarks && (
                                    <p className="text-sm text-gray-600 mt-2">
                                      {schedule.remarks}
                                    </p>
                                  )}
                                </div>
                              </Card>
                            </motion.div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </AnimatePresence>
                  </div>
                )}
              </Droppable>
            </motion.div>
          );
        })}
      </div>
    </DragDropContext>
  );
}