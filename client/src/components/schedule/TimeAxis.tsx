import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TimeAxisProps {
  className?: string;
  startHour?: number;
  endHour?: number;
}

export function TimeAxis({ className, startHour = 6, endHour = 22 }: TimeAxisProps) {
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  return (
    <div 
      className={cn(
        "w-24 flex-shrink-0 border-r border-orange-100/50",
        "bg-gradient-to-b from-white/95 via-white/90 to-white/95",
        "backdrop-blur-md shadow-lg",
        className
      )}
    >
      <div className="relative h-full">
        {hours.map((hour) => (
          <motion.div
            key={hour}
            className="absolute w-full group"
            style={{ top: (hour - startHour) * 80 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className="flex items-center h-20 relative">
              <div className="absolute inset-0 group-hover:bg-orange-50/30 transition-colors duration-200" />
              <div className="relative flex items-center w-full">
                <span className="text-sm font-medium text-gray-600 px-3 group-hover:text-orange-600 transition-colors duration-200">
                  {format(new Date().setHours(hour, 0), "HH:mm")}
                </span>
                <div className="flex-1">
                  <div className="h-px bg-gradient-to-r from-orange-200/50 to-transparent group-hover:from-orange-300/50 transition-colors duration-200" />
                </div>
              </div>
              {/* 每小时的30分钟刻度 */}
              <div className="absolute left-0 top-10 w-full flex items-center opacity-50">
                <span className="text-xs text-gray-400 px-3">30</span>
                <div className="flex-1">
                  <div className="h-px bg-gradient-to-r from-orange-100/30 to-transparent" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {/* 磨砂玻璃效果的渐变边框 */}
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-orange-100/20 via-orange-200/30 to-orange-100/20" />
    </div>
  );
}