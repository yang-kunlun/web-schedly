import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeAxisProps {
  className?: string;
}

export function TimeAxis({ className }: TimeAxisProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className={cn("w-20 flex-shrink-0 border-r bg-white", className)}>
      <div className="relative h-full">
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute w-full"
            style={{ top: hour * 80 }}
          >
            <div className="flex items-center h-5">
              <span className="text-sm text-gray-500 px-2">
                {format(new Date().setHours(hour, 0), "HH:mm")}
              </span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}