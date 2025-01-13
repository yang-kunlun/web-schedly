import { Schedule } from "@db/schema";

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingSchedules: Array<{
    id: number;
    title: string;
    startTime: string;
    endTime: string;
    overlapDuration: number; // 重叠时间（分钟）
  }>;
  severity: "low" | "medium" | "high";
  suggestion: string;
}

export function detectScheduleConflicts(
  schedule: Partial<Schedule>,
  existingSchedules: Schedule[]
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
      overlapDuration
    };
  });

  // 根据冲突数量和重叠时间判断严重程度
  const totalOverlap = conflictingSchedules.reduce((sum, c) => sum + c.overlapDuration, 0);
  const severity = 
    totalOverlap > 120 ? "high" : // 总重叠超过2小时
    totalOverlap > 60 ? "medium" : // 总重叠超过1小时
    "low"; // 轻微重叠

  // 生成建议
  let suggestion = "检测到以下时间冲突：\n";
  conflictingSchedules.forEach(conflict => {
    suggestion += `- 与"${conflict.title}"重叠${conflict.overlapDuration}分钟\n`;
  });
  
  if (severity === "high") {
    suggestion += "\n建议：请考虑重新安排时间，当前冲突较严重。";
  } else if (severity === "medium") {
    suggestion += "\n建议：可以适当调整时间，避免影响其他日程。";
  } else {
    suggestion += "\n建议：冲突时间较短，如果可以及时切换任务，可以保持当前安排。";
  }

  return {
    hasConflict: true,
    conflictingSchedules,
    severity,
    suggestion
  };
}
