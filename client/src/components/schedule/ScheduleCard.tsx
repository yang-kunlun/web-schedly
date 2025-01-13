import { Schedule } from "@/types/schedule";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { CheckCircle, Circle, Clock, MapPin, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isHovered, setIsHovered] = useState(false);

  const isOngoing =
    !schedule.isDone &&
    new Date() >= schedule.startTime &&
    new Date() <= schedule.endTime;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      layout
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
      }}
    >
      <Card
        className={cn(
          "w-full transition-all duration-300",
          "bg-white/80 backdrop-blur-md",
          "border border-orange-100/50",
          isHovered && "shadow-lg shadow-orange-100/50 ring-2 ring-orange-200/50",
          isOngoing && "bg-gradient-to-r from-orange-100/80 to-orange-50/80",
          schedule.isDone && "opacity-75"
        )}
      >
        <CardContent className="p-4 relative overflow-hidden">
          {/* Background blur effects */}
          <div 
            className={cn(
              "absolute inset-0 transition-opacity duration-300",
              isHovered ? "opacity-100" : "opacity-0"
            )}
            style={{
              background: "radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,237,213,0.4) 0%, rgba(255,255,255,0) 60%)",
              mixBlendMode: "overlay",
            }}
          />

          <motion.div className="flex items-start justify-between relative">
            <div
              className="flex-1 cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStatus(schedule.id, !schedule.isDone);
                  }}
                  className="text-orange-500 hover:text-orange-600"
                >
                  <motion.div
                    initial={false}
                    animate={{
                      rotate: schedule.isDone ? 360 : 0,
                      scale: schedule.isDone ? 1.1 : 1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                    }}
                  >
                    {schedule.isDone ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </motion.div>
                </motion.button>
                <motion.h3
                  animate={{
                    opacity: schedule.isDone ? 0.5 : 1,
                    scale: schedule.isDone ? 0.98 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "text-lg font-semibold",
                    schedule.isDone && "line-through"
                  )}
                >
                  {schedule.title}
                </motion.h3>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ 
                    rotate: isExpanded ? 360 : 0,
                    scale: isExpanded ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Clock className="h-4 w-4" />
                </motion.div>
                <span>
                  {format(schedule.startTime, "HH:mm")} -{" "}
                  {format(schedule.endTime, "HH:mm")}
                </span>
              </div>
            </div>
            <motion.div 
              className="flex gap-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ 
                opacity: isHovered ? 1 : 0,
                x: isHovered ? 0 : 20,
                scale: isHovered ? 1 : 0.8,
              }}
              transition={{
                duration: 0.2,
                ease: "easeInOut",
              }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(schedule)}
                className="hover:bg-orange-100/50 backdrop-blur-sm"
              >
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Edit className="h-4 w-4" />
                </motion.div>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(schedule.id)}
                className="hover:bg-red-100/50 backdrop-blur-sm"
              >
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Trash className="h-4 w-4" />
                </motion.div>
              </Button>
            </motion.div>
          </motion.div>

          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ 
                  height: "auto",
                  opacity: 1,
                  transition: {
                    height: {
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                    },
                    opacity: {
                      duration: 0.2,
                      delay: 0.1,
                    },
                  },
                }}
                exit={{ 
                  height: 0,
                  opacity: 0,
                  transition: {
                    height: {
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                    },
                    opacity: {
                      duration: 0.2,
                    },
                  },
                }}
                className="overflow-hidden"
              >
                <div className="relative mt-4 pt-4 border-t border-orange-100/30">
                  {/* 磨砂玻璃效果的装饰元素 */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-orange-200/20 via-orange-100/10 to-orange-200/20" />

                  {schedule.location && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      transition={{ 
                        delay: 0.1,
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <MapPin className="h-4 w-4" />
                      <span>{schedule.location}</span>
                    </motion.div>
                  )}
                  {schedule.remarks && (
                    <motion.p
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      transition={{ 
                        delay: 0.2,
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                      className="mt-2 text-sm text-gray-600"
                    >
                      {schedule.remarks}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}