import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Schedule } from "@/types/schedule";
import { analyzeSchedule, checkScheduleConflicts } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  Clock, 
  MapPin, 
  MessageSquare, 
  Loader2,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "@/hooks/use-debounce";

interface NewScheduleDialogProps {
  schedule?: Schedule;
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: Partial<Schedule>) => void;
}

interface SeverityConfig {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const priorityConfig = {
  high: {
    label: "高优先级",
    description: "紧急且重要的任务，需要立即处理，对其他任务或目标有重大影响",
    icon: ArrowUp,
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
  normal: {
    label: "普通优先级",
    description: "重要但不紧急的任务，按计划处理即可",
    icon: ArrowRight,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  low: {
    label: "低优先级",
    description: "可以稍后处理的任务，推迟执行不会造成明显影响",
    icon: ArrowDown,
    color: "text-green-500",
    bgColor: "bg-green-50",
  }
} as const;

const severityConfig: Record<string, SeverityConfig> = {
  low: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200"
  },
  medium: {
    icon: AlertCircle,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200"
  },
  high: {
    icon: AlertOctagon,
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200"
  }
};

export function NewScheduleDialog({
  schedule,
  isOpen,
  onClose,
  onSave,
}: NewScheduleDialogProps) {
  const [title, setTitle] = useState(schedule?.title || "");
  const [startTime, setStartTime] = useState(
    schedule?.startTime ? new Date(schedule.startTime).toISOString().slice(0, 16) : ""
  );
  const [endTime, setEndTime] = useState(
    schedule?.endTime ? new Date(schedule.endTime).toISOString().slice(0, 16) : ""
  );
  const [location, setLocation] = useState(schedule?.location || "");
  const [remarks, setRemarks] = useState(schedule?.remarks || "");
  const [priority, setPriority] = useState<"high" | "normal" | "low">(schedule?.priority || "normal");
  const [priorityExplanation, setPriorityExplanation] = useState<string>("");
  const [isAIPriority, setIsAIPriority] = useState(false);
  const [description, setDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [conflicts, setConflicts] = useState<any>(null);
  const { toast } = useToast();

  const debouncedStartTime = useDebounce(startTime, 500);
  const debouncedEndTime = useDebounce(endTime, 500);

  useEffect(() => {
    if (debouncedStartTime && debouncedEndTime) {
      checkConflicts();
    }
  }, [debouncedStartTime, debouncedEndTime]);

  const checkConflicts = async () => {
    try {
      setIsCheckingConflicts(true);
      const result = await checkScheduleConflicts({
        id: schedule?.id,
        title,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      });
      setConflicts(result);
    } catch (error) {
      console.error("Failed to check conflicts:", error);
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  const handleAIAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      const suggestion = await analyzeSchedule(description);

      if (suggestion) {
        setTitle(suggestion.title || "");
        if (suggestion.startTime) setStartTime(suggestion.startTime.slice(0, 16));
        if (suggestion.endTime) setEndTime(suggestion.endTime.slice(0, 16));
        if (suggestion.location) setLocation(suggestion.location);
        if (suggestion.remarks) setRemarks(suggestion.remarks);
        if (suggestion.priority) {
          setPriority(suggestion.priority);
          setIsAIPriority(true);
          setPriorityExplanation("AI建议的优先级，您可以根据实际需要修改。");
        }

        toast({
          title: "AI分析完成",
          description: "已自动填充日程信息，请检查并按需修改。",
        });

        await checkConflicts();
      }
    } catch (error) {
      toast({
        title: "AI分析失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderConflictAlert = () => {
    if (!conflicts?.hasConflict) return null;

    const config = severityConfig[conflicts.severity || 'low'];
    const Icon = config.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Alert className={`${config.bgColor} border ${config.borderColor} mb-4`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
          <AlertTitle className={config.color}>时间冲突警告</AlertTitle>
          <AlertDescription className="mt-2 text-sm">
            {conflicts.suggestion.split('\n').map((line: string, i: number) => (
              <p key={i} className="mb-1">{line}</p>
            ))}
          </AlertDescription>
        </Alert>
      </motion.div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (conflicts?.hasConflict && conflicts.severity === "high") {
      const confirmed = window.confirm(
        "检测到严重的时间冲突，确定要继续保存吗？"
      );
      if (!confirmed) return;
    }

    onSave({
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      remarks,
      priority,
    });
    onClose();
  };

  const handlePriorityChange = (value: "high" | "normal" | "low") => {
    setPriority(value);
    setIsAIPriority(false);
    setPriorityExplanation("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {schedule ? "编辑日程" : "新建日程"}
          </DialogTitle>
        </DialogHeader>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-orange-500" />
                <Label>使用AI助手</Label>
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="用自然语言描述你的日程，例如：'下午两点到三点开项目会议'"
                  className="min-h-[80px]"
                />
                <Button
                  type="button"
                  onClick={handleAIAnalyze}
                  disabled={!description || isAnalyzing}
                  className="self-start"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence>
                {conflicts && renderConflictAlert()}
              </AnimatePresence>

              <motion.div
                initial={false}
                animate={{ 
                  height: "auto",
                  opacity: 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="title">标题</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="border-orange-200 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      开始时间
                    </Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="border-orange-200 focus:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">结束时间</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="border-orange-200 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority" className="flex items-center gap-2">
                    优先级
                    {isAIPriority && (
                      <div className="ml-2 flex items-center text-sm text-gray-500">
                        <Info className="h-4 w-4 mr-1" />
                        AI建议
                      </div>
                    )}
                  </Label>
                  <Select
                    value={priority}
                    onValueChange={handlePriorityChange}
                  >
                    <SelectTrigger className={`${priorityConfig[priority].bgColor}`}>
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          {priority && (
                            <>
                              {React.createElement(priorityConfig[priority].icon, {
                                className: `h-4 w-4 ${priorityConfig[priority].color}`
                              })}
                              <span>{priorityConfig[priority].label}</span>
                            </>
                          )}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <SelectItem 
                          key={key} 
                          value={key}
                          className={`${config.bgColor} hover:${config.bgColor}`}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {React.createElement(config.icon, {
                                className: `h-4 w-4 ${config.color}`
                              })}
                              <span className="font-medium">{config.label}</span>
                            </div>
                            <p className="text-xs text-gray-500 pl-6">
                              {config.description}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {priorityExplanation && (
                    <p className="text-sm text-gray-500 mt-1">{priorityExplanation}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-orange-500" />
                    地点
                  </Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="border-orange-200 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">备注</Label>
                  <Textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="min-h-[80px] border-orange-200 focus:ring-orange-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                  >
                    取消
                  </Button>
                  <Button type="submit">
                    保存
                  </Button>
                </div>
              </motion.div>
            </form>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}