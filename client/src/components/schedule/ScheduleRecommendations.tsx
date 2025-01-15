import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Clock,
  Calendar,
  Brain,
  ArrowUpRight,
  Lightbulb,
  CheckCheck,
  LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getScheduleRecommendations } from "@/lib/api";
import { Schedule } from "@/types/schedule";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ScheduleRecommendation {
  title: string;
  suggestedStartTime: string;
  suggestedEndTime: string;
  priority: "high" | "normal" | "low";
  category: "work" | "meeting" | "break" | "personal";
  reasoning: string;
  efficiency: {
    score: number;
    factors: string[];
  };
  alternativeSlots?: Array<{
    startTime: string;
    endTime: string;
    benefit: string;
  }>;
}

interface ScheduleRecommendationsProps {
  date: Date;
  onSelectRecommendation: (recommendation: ScheduleRecommendation) => void;
}

const categoryConfig = {
  work: { icon: Brain, color: "text-blue-500", bg: "bg-blue-50" },
  meeting: { icon: Calendar, color: "text-purple-500", bg: "bg-purple-50" },
  break: { icon: CheckCheck, color: "text-green-500", bg: "bg-green-50" },
  personal: { icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-50" },
} as const;

type CategoryKey = keyof typeof categoryConfig;

export function ScheduleRecommendations({ 
  date,
  onSelectRecommendation 
}: ScheduleRecommendationsProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ["/api/schedules/recommendations", date.toISOString()],
    queryFn: () => getScheduleRecommendations(date),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="bg-muted/50">
            <CardContent className="p-6">
              <div className="h-20 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!recommendations.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <LayoutGrid className="h-5 w-5 text-orange-500" />
        <h2>智能推荐</h2>
      </div>
      <div className="grid gap-4">
        {recommendations.map((recommendation: ScheduleRecommendation, index: number) => {
          const category = recommendation.category as CategoryKey;
          const CategoryIcon = categoryConfig[category].icon;
          const isExpanded = expandedId === index;

          return (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  "cursor-pointer transition-shadow hover:shadow-md",
                  categoryConfig[category].bg
                )}
                onClick={() => setExpandedId(isExpanded ? null : index)}
              >
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <CategoryIcon 
                          className={cn(
                            "h-5 w-5 mt-1",
                            categoryConfig[category].color
                          )} 
                        />
                        <div>
                          <h3 className="font-medium">{recommendation.title}</h3>
                          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {format(new Date(recommendation.suggestedStartTime), "HH:mm", { locale: zhCN })}
                                {" - "}
                                {format(new Date(recommendation.suggestedEndTime), "HH:mm", { locale: zhCN })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ArrowUpRight className="h-4 w-4" />
                              <span>效率评分: {recommendation.efficiency.score}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecommendation(recommendation);
                        }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3 pt-2"
                        >
                          <div className="space-y-2">
                            <h4 className="font-medium">推荐原因</h4>
                            <p className="text-sm text-gray-600">{recommendation.reasoning}</p>
                          </div>

                          {recommendation.efficiency.factors.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium">效率因素</h4>
                              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {recommendation.efficiency.factors.map((factor: string, i: number) => (
                                  <li key={i}>{factor}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {recommendation.alternativeSlots && recommendation.alternativeSlots.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium">备选时间</h4>
                              <div className="space-y-2">
                                {recommendation.alternativeSlots.map((slot: { startTime: string; endTime: string; benefit: string }, i: number) => (
                                  <div
                                    key={i}
                                    className="text-sm text-gray-600 flex items-start gap-2"
                                  >
                                    <Clock className="h-4 w-4 mt-0.5" />
                                    <div>
                                      <div>
                                        {format(new Date(slot.startTime), "HH:mm", { locale: zhCN })}
                                        {" - "}
                                        {format(new Date(slot.endTime), "HH:mm", { locale: zhCN })}
                                      </div>
                                      <p className="text-gray-500 mt-0.5">{slot.benefit}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}