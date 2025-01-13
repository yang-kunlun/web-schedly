import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeAxisProps {
  className?: string;
}

export function TimeAxis({ className }: TimeAxisProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className={cn("w-16 flex flex-col border-r relative", className)}>
      {hours.map((hour) => (
        <div
          key={hour}
          className="h-20 relative"
        >
          <div className="absolute -top-3 right-0 w-full flex items-center">
            <span className="text-sm text-gray-500 pr-2">
              {format(new Date().setHours(hour, 0), "HH:mm")}
            </span>
            <div className="flex-1 border-t border-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}