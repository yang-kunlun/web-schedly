import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeAxisProps {
  className?: string;
}

export function TimeAxis({ className }: TimeAxisProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  return (
    <div className={cn("w-16 flex flex-col border-r", className)}>
      {hours.map((hour) => (
        <div
          key={hour}
          className="h-20 flex items-start justify-end pr-2 text-sm text-gray-500"
        >
          {format(new Date().setHours(hour, 0), "HH:mm")}
        </div>
      ))}
    </div>
  );
}
