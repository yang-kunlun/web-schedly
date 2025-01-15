import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface TimeAxisProps {
  className?: string;
  startHour?: number;
  endHour?: number;
}

export function TimeAxis({ className, startHour = 6, endHour = 22 }: TimeAxisProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 每分钟更新一次

    return () => clearInterval(timer);
  }, []);

  // 生成时间刻度数组，包含起止时间
  const hours = Array.from(
    { length: endHour - startHour + 1 }, 
    (_, i) => startHour + i
  );

  // 计算当前时间指示器的位置
  const getCurrentTimePosition = () => {
    const now = currentTime;
    const hour = now.getHours();
    const minutes = now.getMinutes();
    if (hour < startHour || hour > endHour) return null;

    // 计算相对于startHour的小时差
    const hourDiff = hour - startHour;
    // 加上分钟的比例
    return (hourDiff * 100) + ((minutes / 60) * 100);
  };

  const currentTimePosition = getCurrentTimePosition();

  return (
    <div 
      className={cn(
        "w-16 sm:w-24 flex-shrink-0 border-r border-orange-100/50 relative select-none",
        "bg-gradient-to-b from-white/95 via-white/90 to-white/95",
        "backdrop-blur-md shadow-lg",
        className
      )}
    >
      <div className="relative h-full">
        {/* 时间刻度 */}
        {hours.map((hour, index) => {
          const date = new Date();
          date.setHours(hour, 0, 0, 0);
          const isHovered = hoveredHour === hour;

          return (
            <motion.div
              key={hour}
              className="absolute w-full cursor-pointer"
              style={{ 
                top: `${index * 100}px`,
                height: "100px"
              }}
              onHoverStart={() => setHoveredHour(hour)}
              onHoverEnd={() => setHoveredHour(null)}
              whileHover={{ scale: 1.02 }}
            >
              {/* 整点刻度 */}
              <div className="relative h-full group">
                <motion.div 
                  className="absolute inset-0 bg-orange-50/0 transition-colors duration-200"
                  animate={{
                    backgroundColor: isHovered ? "rgba(255, 237, 213, 0.3)" : "rgba(255, 237, 213, 0)"
                  }}
                />
                <div className="relative flex items-center h-10">
                  <motion.div
                    className="flex items-center gap-1 px-2 sm:px-3"
                    animate={{
                      scale: isHovered ? 1.05 : 1
                    }}
                  >
                    <span className={cn(
                      "text-xs sm:text-sm font-medium transition-colors duration-200",
                      isHovered ? "text-orange-600" : "text-gray-600"
                    )}>
                      {format(date, "HH:mm")}
                    </span>
                  </motion.div>
                  <div className="flex-1">
                    <motion.div
                      className="h-px bg-gradient-to-r from-orange-200/50 to-transparent"
                      animate={{
                        scaleX: isHovered ? 1.1 : 1
                      }}
                      style={{ originX: 0 }}
                    />
                  </div>
                </div>

                {/* 30分钟刻度 */}
                <div className="absolute top-1/2 left-0 w-full flex items-center opacity-50">
                  <span className={cn(
                    "text-[10px] sm:text-xs px-2 sm:px-3 transition-colors duration-200",
                    isHovered ? "text-orange-500" : "text-gray-400"
                  )}>
                    30
                  </span>
                  <div className="flex-1">
                    <motion.div 
                      className="h-px bg-gradient-to-r from-orange-100/30 to-transparent"
                      animate={{
                        scaleX: isHovered ? 1.05 : 1
                      }}
                      style={{ originX: 0 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* 当前时间指示器 */}
        <AnimatePresence>
          {currentTimePosition !== null && (
            <motion.div
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ top: `${currentTimePosition}px` }}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
            >
              <div className="relative flex items-center">
                <div className="absolute -left-1 w-2 h-2 bg-orange-500 rounded-full shadow-lg" />
                <div className="w-full h-px bg-orange-500/50" />
                <div className="absolute left-3 -top-4 flex items-center gap-1 bg-orange-500 text-white text-[10px] sm:text-xs px-2 py-1 rounded-full shadow-lg">
                  <Clock className="w-3 h-3" />
                  <span>{format(currentTime, "HH:mm")}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 装饰性边框 */}
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-orange-100/20 via-orange-200/30 to-orange-100/20" />
    </div>
  );
}