import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TimeAxisProps {
  className?: string;
  startHour?: number;
  endHour?: number;
}

export function TimeAxis({ className, startHour = 6, endHour = 22 }: TimeAxisProps) {
  // 生成时间刻度数组，包含起止时间
  const hours = Array.from(
    { length: endHour - startHour + 1 }, 
    (_, i) => startHour + i
  );

  return (
    <div 
      className={cn(
        "w-24 flex-shrink-0 border-r border-orange-100/50 relative",
        "bg-gradient-to-b from-white/95 via-white/90 to-white/95",
        "backdrop-blur-md shadow-lg",
        className
      )}
    >
      <div className="relative h-full">
        {hours.map((hour, index) => {
          const date = new Date();
          date.setHours(hour, 0, 0, 0);

          return (
            <div
              key={hour}
              className="absolute w-full"
              style={{ 
                top: `${index * 80}px`,
                height: "80px"
              }}
            >
              {/* 整点刻度 */}
              <div className="relative h-full group">
                <div className="absolute inset-0 group-hover:bg-orange-50/30 transition-colors duration-200" />
                <div className="relative flex items-center h-10">
                  <motion.span
                    className="text-sm font-medium text-gray-600 px-3 group-hover:text-orange-600 transition-colors duration-200"
                    whileHover={{ scale: 1.1 }}
                  >
                    {format(date, "HH:mm")}
                  </motion.span>
                  <div className="flex-1">
                    <motion.div
                      className="h-px bg-gradient-to-r from-orange-200/50 to-transparent"
                      whileHover={{ scaleX: 1.1, originX: 0 }}
                    />
                  </div>
                </div>

                {/* 30分钟刻度 */}
                <div className="absolute top-1/2 left-0 w-full flex items-center opacity-50">
                  <span className="text-xs text-gray-400 px-3">30</span>
                  <div className="flex-1">
                    <div className="h-px bg-gradient-to-r from-orange-100/30 to-transparent" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 装饰性边框 */}
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-orange-100/20 via-orange-200/30 to-orange-100/20" />
    </div>
  );
}