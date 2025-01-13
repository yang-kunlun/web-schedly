import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Brain, Clock, Heart, Sparkles, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProductivityAdvice {
  summary: string;
  timeBalance: string;
  productivity: string;
  health: string;
  score: number;
}

interface ProductivityAdviceProps {
  date: Date;
}

export function ProductivityAdvice({ date }: ProductivityAdviceProps) {
  const { data: advice, isLoading } = useQuery({
    queryKey: ["/api/schedules/advice", date.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/schedules/advice?date=${date.toISOString()}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch advice");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6 space-y-4 animate-pulse">
        <div className="h-4 bg-orange-100 rounded w-3/4" />
        <div className="space-y-2">
          <div className="h-4 bg-orange-100 rounded w-full" />
          <div className="h-4 bg-orange-100 rounded w-5/6" />
        </div>
      </Card>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Card className="relative overflow-hidden">
        {/* 磨砂玻璃背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/90 to-white/90 backdrop-blur-sm" />
        
        {/* 装饰性背景 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,237,213,0.4),transparent_70%)]" />

        <motion.div 
          className="relative p-6 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-semibold">AI效率助手</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">效率评分</span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-orange-400 text-orange-400" />
                <span className="font-semibold text-orange-500">{advice?.score}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 bg-white/50 rounded-lg border border-orange-100/50 backdrop-blur-sm"
            >
              <p className="text-gray-700">{advice?.summary}</p>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  "p-4 rounded-lg space-y-2",
                  "bg-gradient-to-br from-orange-50/50 to-white/50",
                  "border border-orange-100/50 backdrop-blur-sm"
                )}
              >
                <div className="flex items-center gap-2 text-orange-600">
                  <Clock className="h-4 w-4" />
                  <h4 className="font-medium">时间分配</h4>
                </div>
                <p className="text-sm text-gray-600">{advice?.timeBalance}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={cn(
                  "p-4 rounded-lg space-y-2",
                  "bg-gradient-to-br from-orange-50/50 to-white/50",
                  "border border-orange-100/50 backdrop-blur-sm"
                )}
              >
                <div className="flex items-center gap-2 text-orange-600">
                  <Sparkles className="h-4 w-4" />
                  <h4 className="font-medium">效率提升</h4>
                </div>
                <p className="text-sm text-gray-600">{advice?.productivity}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={cn(
                  "p-4 rounded-lg space-y-2 sm:col-span-2",
                  "bg-gradient-to-br from-orange-50/50 to-white/50",
                  "border border-orange-100/50 backdrop-blur-sm"
                )}
              >
                <div className="flex items-center gap-2 text-orange-600">
                  <Heart className="h-4 w-4" />
                  <h4 className="font-medium">健康建议</h4>
                </div>
                <p className="text-sm text-gray-600">{advice?.health}</p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </Card>
    </AnimatePresence>
  );
}
