import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, isEqual } from "date-fns";
import { zhCN } from "date-fns/locale";

interface DateHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  weekDays: Date[];
  onSelectDay: (day: Date) => void;
}

export function DateHeader({
  currentDate,
  onDateChange,
  weekDays,
  onSelectDay,
}: DateHeaderProps) {
  const handlePrevMonth = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  return (
    <div className="space-y-4 p-4 bg-white border-b">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(currentDate, "yyyy年MM月", { locale: zhCN })}
        </h2>
        <Button variant="ghost" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex justify-between">
        {weekDays.map((day) => (
          <Button
            key={day.toString()}
            variant={isEqual(day, currentDate) ? "default" : "ghost"}
            className="w-20"
            onClick={() => onSelectDay(day)}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm">
                {format(day, "EEE", { locale: zhCN })}
              </span>
              <span className="text-lg font-semibold">
                {format(day, "d")}
              </span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
