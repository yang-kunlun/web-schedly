import { schedules, type InsertSchedule, type SelectSchedule } from "@db/schema";

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingSchedules: Array<{
    id: number;
    title: string;
    startTime: string;
    endTime: string;
    overlapDuration: number; // 重叠时间（分钟）
    priority: string;      // 添加优先级信息
  }>;
  severity: "low" | "medium" | "high";
  suggestion: string;
  alternativeTimes?: Array<{
    startTime: string;
    endTime: string;
    benefit: string;
  }>;
}

export function detectScheduleConflicts(
  schedule: Partial<SelectSchedule>,
  existingSchedules: SelectSchedule[]
): ConflictInfo {
  const conflicts = existingSchedules.filter(existing => {
    // 跳过当前正在编辑的日程
    if (schedule.id === existing.id) return false;

    const newStart = new Date(schedule.startTime!);
    const newEnd = new Date(schedule.endTime!);
    const existingStart = new Date(existing.startTime);
    const existingEnd = new Date(existing.endTime);

    // 检查是否有时间重叠
    return (
      (newStart >= existingStart && newStart < existingEnd) || // 新日程开始时间在现有日程期间
      (newEnd > existingStart && newEnd <= existingEnd) || // 新日程结束时间在现有日程期间
      (newStart <= existingStart && newEnd >= existingEnd) // 新日程完全包含现有日程
    );
  });

  if (conflicts.length === 0) {
    return {
      hasConflict: false,
      conflictingSchedules: [],
      severity: "low",
      suggestion: "没有检测到时间冲突。"
    };
  }

  // 计算冲突细节
  const conflictingSchedules = conflicts.map(conflict => {
    const newStart = new Date(schedule.startTime!);
    const newEnd = new Date(schedule.endTime!);
    const existingStart = new Date(conflict.startTime);
    const existingEnd = new Date(conflict.endTime);

    // 计算重叠时间（分钟）
    const overlapStart = new Date(Math.max(newStart.getTime(), existingStart.getTime()));
    const overlapEnd = new Date(Math.min(newEnd.getTime(), existingEnd.getTime()));
    const overlapDuration = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));

    return {
      id: conflict.id,
      title: conflict.title,
      startTime: conflict.startTime.toISOString(),
      endTime: conflict.endTime.toISOString(),
      overlapDuration,
      priority: conflict.priority || 'normal'
    };
  });

  // 根据冲突情况的复杂度计算严重程度
  const severityFactors = {
    totalOverlap: 0,
    highPriorityConflicts: 0,
    normalPriorityConflicts: 0,
    lowPriorityConflicts: 0
  };

  conflictingSchedules.forEach(conflict => {
    severityFactors.totalOverlap += conflict.overlapDuration;

    switch(conflict.priority) {
      case 'high':
        severityFactors.highPriorityConflicts++;
        break;
      case 'normal':
        severityFactors.normalPriorityConflicts++;
        break;
      case 'low':
        severityFactors.lowPriorityConflicts++;
        break;
    }
  });

  // 根据多个因素综合判断严重程度
  let severity: "low" | "medium" | "high" = "low";
  if (
    severityFactors.totalOverlap > 120 || // 总重叠超过2小时
    severityFactors.highPriorityConflicts > 0 // 存在高优先级冲突
  ) {
    severity = "high";
  } else if (
    severityFactors.totalOverlap > 60 || // 总重叠超过1小时
    severityFactors.normalPriorityConflicts > 1 // 多个普通优先级冲突
  ) {
    severity = "medium";
  }

  // 生成智能建议
  let suggestion = "检测到以下时间冲突：\n";
  conflictingSchedules.forEach(conflict => {
    const priorityText = 
      conflict.priority === 'high' ? '(高优先级)' :
      conflict.priority === 'low' ? '(低优先级)' : '';

    suggestion += `- 与"${conflict.title}"${priorityText}重叠${conflict.overlapDuration}分钟\n`;
  });

  // 根据不同情况生成具体建议
  if (severity === "high") {
    suggestion += "\n建议处理方案：\n";
    suggestion += "1. 考虑调整当前日程时间，避免与高优先级日程冲突\n";
    suggestion += "2. 如果时间无法调整，建议与相关人员协调，重新安排部分日程\n";
    suggestion += "3. 可以考虑拆分当前日程，分多个时段进行";
  } else if (severity === "medium") {
    suggestion += "\n建议处理方案：\n";
    suggestion += "1. 评估是否可以调整部分重叠时间段\n";
    suggestion += "2. 考虑精简部分日程内容，缩短所需时间\n";
    suggestion += "3. 如时间充裕，可以设置缓冲时间避免紧密衔接";
  } else {
    suggestion += "\n建议处理方案：\n";
    suggestion += "1. 当前冲突影响较小，可以保持现有安排\n";
    suggestion += "2. 建议提前5-10分钟开始准备，确保能顺利切换任务";
  }

  // 生成替代时间建议
  const alternativeTimes = generateAlternativeTimes(schedule, existingSchedules);

  return {
    hasConflict: true,
    conflictingSchedules,
    severity,
    suggestion,
    alternativeTimes
  };
}

function generateAlternativeTimes(
  schedule: Partial<SelectSchedule>,
  existingSchedules: SelectSchedule[]
): { startTime: string; endTime: string; benefit: string }[] {
  const duration = new Date(schedule.endTime!).getTime() - new Date(schedule.startTime!).getTime();
  const alternatives: { startTime: string; endTime: string; benefit: string }[] = [];

  // 获取当天的开始和结束时间
  const currentDate = new Date(schedule.startTime!);
  const dayStart = new Date(currentDate.setHours(9, 0, 0, 0)); // 默认工作时间从9点开始
  const dayEnd = new Date(currentDate.setHours(18, 0, 0, 0));  // 默认工作时间到18点结束

  // 寻找空闲时段
  let currentTime = new Date(dayStart);
  while (currentTime < dayEnd) {
    const potentialStart = new Date(currentTime);
    const potentialEnd = new Date(potentialStart.getTime() + duration);

    // 检查这个时间段是否有冲突
    const hasConflict = existingSchedules.some(existing => {
      const existingStart = new Date(existing.startTime);
      const existingEnd = new Date(existing.endTime);
      return (
        (potentialStart >= existingStart && potentialStart < existingEnd) ||
        (potentialEnd > existingStart && potentialEnd <= existingEnd) ||
        (potentialStart <= existingStart && potentialEnd >= existingEnd)
      );
    });

    if (!hasConflict && potentialEnd <= dayEnd) {
      // 评估这个时间段的优势
      let benefit = "";
      const hour = potentialStart.getHours();

      if (hour >= 9 && hour <= 11) {
        benefit = "上午时段，精力充沛，适合重要工作";
      } else if (hour >= 14 && hour <= 16) {
        benefit = "下午黄金时段，注意力较集中";
      } else if (hour >= 12 && hour <= 13) {
        benefit = "建议避开午餐时间";
      } else {
        benefit = "常规工作时段，适合一般性工作";
      }

      alternatives.push({
        startTime: potentialStart.toISOString(),
        endTime: potentialEnd.toISOString(),
        benefit
      });

      // 最多提供3个建议
      if (alternatives.length >= 3) break;
    }

    // 向后移动30分钟
    currentTime.setMinutes(currentTime.getMinutes() + 30);
  }

  return alternatives;
}