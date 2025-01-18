import { PROMPTS } from "../constants";
import { type Schedule } from "@db/schema";

interface ScheduleSuggestion {
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  remarks?: string;
  priority?: "high" | "normal" | "low";
}

interface ScheduleRecommendation {
  title: string;
  suggestedStartTime: string;
  suggestedEndTime: string;
  priority: "high" | "normal" | "low";
  reasoning: string;
  category: "work" | "meeting" | "break" | "personal";
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

interface TimeBlockAnalysis {
  category: "work" | "meeting" | "break" | "focus" | "other";
  efficiencyScore: number;
  priorityScore: number;
  suggestions: {
    optimization: string[];
    timing: string[];
    breaks: string[];
  };
  factors: {
    positive: string[];
    negative: string[];
  };
}

interface TimeBlockInterval {
  recommendedInterval: number; 
  minInterval: number; 
  maxInterval: number; 
  reasoning: string; 
  factors: {
    physiological: string[]; 
    productivity: string[]; 
    workStyle: string[]; 
  };
  adjustments: Array<{
    condition: string; 
    intervalAdjustment: number; 
    reason: string; 
  }>;
}

export async function analyzeTimeBlock(
  schedule: Schedule,
  existingSchedules: Schedule[]
): Promise<TimeBlockAnalysis> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }

  try {
    const context = {
      schedule: {
        title: schedule.title,
        description: schedule.remarks || "",
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        location: schedule.location,
      },
      existingSchedules: existingSchedules.map(s => ({
        title: s.title,
        description: s.remarks || "",
        startTime: s.startTime,
        endTime: s.endTime,
        category: s.timeBlockCategory,
        efficiency: s.timeBlockEfficiency,
      })),
      currentTime: new Date().toISOString(),
    };

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { 
            role: "system", 
            content: `你是一个专业的时间块分析专家，需要对时间块进行全面分析并提供优化建议。分析维度包括：

1. 时间块分类：
   - 工作任务 (work)
   - 会议安排 (meeting)
   - 休息时间 (break)
   - 专注时段 (focus)
   - 其他活动 (other)

2. 效率评估：
   - 时段适合度
   - 持续时间合理性
   - 与其他时间块的关联
   - 人体生理规律匹配度

3. 优先级评分：
   - 任务重要性
   - 时间紧迫性
   - 对其他时间块的影响
   - 资源依赖程度

4. 优化建议：
   - 时间调整建议
   - 效率提升方案
   - 休息安排优化
   - 时间块整合建议

返回JSON格式：
{
  "category": "work" | "meeting" | "break" | "focus" | "other",
  "efficiencyScore": "效率得分(0-100)",
  "priorityScore": "优先级得分(0-100)",
  "suggestions": {
    "optimization": ["优化建议数组"],
    "timing": ["时间调整建议"],
    "breaks": ["休息安排建议"]
  },
  "factors": {
    "positive": ["积极因素"],
    "negative": ["消极因素"]
  }
}`
          },
          { 
            role: "user", 
            content: JSON.stringify(context)
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    // 验证响应格式
    if (typeof analysis !== 'object' || !analysis.category || 
        typeof analysis.efficiencyScore !== 'number' || 
        typeof analysis.priorityScore !== 'number') {
      console.error("Invalid analysis format:", analysis);
      throw new Error("Invalid analysis format received from AI");
    }

    return analysis;
  } catch (error) {
    console.error("Time block analysis failed:", error);
    throw new Error("Failed to analyze time block");
  }
}

export async function getScheduleRecommendations(
  schedules: Schedule[],
  date: Date
): Promise<ScheduleRecommendation[]> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }

  try {
    const context = {
      existingSchedules: schedules.map(s => ({
        title: s.title,
        description: s.remarks || "",
        startTime: s.startTime,
        endTime: s.endTime,
        priority: s.priority,
        isDone: s.isDone
      })),
      targetDate: date.toISOString(),
      currentTime: new Date().toISOString(),
      dayOfWeek: date.getDay(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { 
            role: "system", 
            content: `你是一个先进的智能日程规划助手，需要基于现有日程提供建议。返回一个建议数组，每个建议包含：
{
  "title": "建议的日程标题",
  "suggestedStartTime": "建议的开始时间",
  "suggestedEndTime": "建议的结束时间",
  "priority": "high/normal/low",
  "category": "work/meeting/break/personal",
  "reasoning": "详细的建议原因",
  "efficiency": {
    "score": "效率评分(0-100)",
    "factors": ["影响效率的因素列表"]
  }
}`
          },
          { 
            role: "user", 
            content: JSON.stringify(context)
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // 验证响应是否为对象
    if (typeof content !== 'object') {
      console.error("Invalid response format:", content);
      throw new Error("Invalid response format from AI");
    }

    // 确保返回的是建议数组
    const recommendations = content.suggestions || [content];

    // 验证每个建议的格式
    recommendations.forEach((rec: any, index: number) => {
      if (!rec.title || !rec.suggestedStartTime || !rec.suggestedEndTime || 
          !rec.priority || !rec.category || !rec.reasoning || 
          !rec.efficiency || typeof rec.efficiency.score !== 'number') {
        console.error(`Invalid recommendation format at index ${index}:`, rec);
        throw new Error(`Invalid recommendation format at index ${index}`);
      }
    });

    return recommendations;
  } catch (error) {
    console.error("Schedule recommendations failed:", error);
    throw new Error("Failed to generate schedule recommendations");
  }
}

export async function analyzePriority(
  schedule: Schedule,
  existingSchedules: Schedule[]
): Promise<PriorityAnalysis> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }

  try {
    const context = {
      schedule: {
        title: schedule.title,
        description: schedule.remarks || "",
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        location: schedule.location,
      },
      existingSchedules: existingSchedules.map(s => ({
        title: s.title,
        description: s.remarks || "",
        startTime: s.startTime,
        endTime: s.endTime,
        priority: s.priority,
      })),
      currentTime: new Date().toISOString(),
    };

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { 
            role: "system", 
            content: `你是一个智能日程优先级分析专家。分析日程的优先级时，需要考虑：
            1. 时间紧迫性：截止时间、持续时间
            2. 任务重要性：通过标题和描述判断任务的关键程度
            3. 上下文关联：与其他日程的依赖关系
            4. 资源投入：所需时间和精力
            5. 影响范围：对其他任务、个人目标的影响

            基于以上因素，为日程分配优先级(high/normal/low)并提供分析说明。
            返回格式：{"priority": "high" | "normal" | "low", "explanation": "分析说明"}`
          },
          { 
            role: "user", 
            content: JSON.stringify(context)
          }
        ],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    // 验证响应格式
    if (!analysis.priority || !analysis.explanation) {
      console.error("Invalid priority analysis format:", analysis);
      throw new Error("Invalid response format");
    }

    return analysis;
  } catch (error) {
    console.error("Priority analysis failed:", error);
    return {
      priority: "normal",
      explanation: "由于AI分析暂时不可用，已设置为默认优先级。您可以手动修改优先级。"
    };
  }
}

export async function getProductivityAdvice(schedules: Schedule[]): Promise<ProductivityAdvice> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }

  try {
    const context = {
      schedules: schedules.map(schedule => ({
        title: schedule.title,
        description: schedule.remarks || "",
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        isDone: schedule.isDone,
        priority: schedule.priority,
      })),
      currentTime: new Date().toISOString(),
    };

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { 
            role: "system", 
            content: `你是一个智能日程管理顾问，基于用户的日程安排提供深度分析和建议。分析维度包括：
            1. 总体评估：日程安排的合理性
            2. 时间分配：各类任务的时间分配是否均衡
            3. 生产效率：任务完成情况和效率
            4. 健康建议：工作与休息的平衡

            返回JSON格式：{
              "summary": "总体评估",
              "timeBalance": "时间分配建议",
              "productivity": "效率提升建议",
              "health": "健康平衡建议",
              "score": "完成度得分(0-100)"
            }`
          },
          { 
            role: "user", 
            content: JSON.stringify(context)
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const advice = data.choices[0].message.content;

    // 验证响应格式
    if (!advice.summary || !advice.timeBalance || !advice.productivity || 
        !advice.health || typeof advice.score !== 'number') {
      console.error("Invalid advice format:", advice);
      throw new Error("Invalid advice format received from AI");
    }

    return advice;
  } catch (error) {
    console.error("AI analysis failed:", error);
    throw new Error("Failed to generate productivity advice");
  }
}

interface PriorityAnalysis {
  priority: "high" | "normal" | "low";
  explanation: string;
}

interface ProductivityAdvice {
  summary: string;
  timeBalance: string;
  productivity: string;
  health: string;
  score: number;
}

export async function analyzeOptimalIntervals(
  schedule: Schedule,
  existingSchedules: Schedule[],
  userPreferences?: {
    preferredWorkDuration?: number;
    preferredBreakDuration?: number;
    energyPeakHours?: number[];
  }
): Promise<TimeBlockInterval> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }

  try {
    const context = {
      schedule: {
        title: schedule.title,
        description: schedule.remarks || "",
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        category: schedule.timeBlockCategory,
        efficiency: schedule.timeBlockEfficiency,
      },
      existingSchedules: existingSchedules.map(s => ({
        title: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        category: s.timeBlockCategory,
        efficiency: s.timeBlockEfficiency,
      })),
      userPreferences,
      currentTime: new Date().toISOString(),
    };

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { 
            role: "system", 
            content: `你是一个专业的时间管理专家，需要分析并推荐最佳的时间块间隔。分析维度包括：

1. 时间块特征：
   - 任务类型和性质
   - 持续时间
   - 精力要求
   - 专注度需求

2. 生理因素：
   - 人体生理节律
   - 注意力持续周期
   - 疲劳恢复规律
   - 能量水平变化

3. 工作效率：
   - 任务切换成本
   - 注意力恢复时间
   - 效率峰值时段
   - 休息效果评估

4. 个性化调整：
   - 个人工作习惯
   - 能量管理模式
   - 休息偏好
   - 环境影响因素

返回JSON格式：
{
  "recommendedInterval": "建议间隔时间(分钟)",
  "minInterval": "最小建议间隔(分钟)",
  "maxInterval": "最大建议间隔(分钟)",
  "reasoning": "推荐原因说明",
  "factors": {
    "physiological": ["生理因素数组"],
    "productivity": ["生产力因素数组"],
    "workStyle": ["工作风格因素数组"]
  },
  "adjustments": [
    {
      "condition": "适用条件",
      "intervalAdjustment": "间隔调整(分钟)",
      "reason": "调整原因"
    }
  ]
}`
          },
          { 
            role: "user", 
            content: JSON.stringify(context)
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    // 验证响应格式
    if (typeof analysis !== 'object' || 
        typeof analysis.recommendedInterval !== 'number' ||
        typeof analysis.minInterval !== 'number' ||
        typeof analysis.maxInterval !== 'number' ||
        !analysis.reasoning ||
        !analysis.factors ||
        !Array.isArray(analysis.adjustments)) {
      console.error("Invalid interval analysis format:", analysis);
      throw new Error("Invalid interval analysis format received from AI");
    }

    return analysis;
  } catch (error) {
    console.error("Interval analysis failed:", error);
    throw new Error("Failed to analyze optimal intervals");
  }
}

export async function analyzeSchedule(description: string): Promise<ScheduleSuggestion> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: PROMPTS.SCHEDULE_ANALYSIS },
          { role: "user", content: description }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    let suggestion: ScheduleSuggestion;

    try {
      suggestion = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      console.error("Failed to parse AI suggestion:", data.choices[0].message.content);
      throw new Error("Failed to parse AI response");
    }

    return suggestion;
  } catch (error) {
    console.error("AI analysis failed:", error);
    throw new Error("Failed to analyze schedule with AI");
  }
}