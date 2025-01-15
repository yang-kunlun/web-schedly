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

interface ProductivityAdvice {
  summary: string;
  timeBalance: string;
  productivity: string;
  health: string;
  score: number;
}

interface PriorityAnalysis {
  priority: "high" | "normal" | "low";
  explanation: string;
}

interface ScheduleRecommendation {
  title: string;
  suggestedStartTime: string;
  suggestedEndTime: string;
  priority: "high" | "normal" | "low";
  reasoning: string;
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
            content: `你是一个智能日程规划助手。基于用户当前的日程安排，提供智能的日程建议。分析时考虑：
            1. 时间分配：避免日程过于密集，确保合理的间隔
            2. 优先级平衡：高优先级任务应优先安排在精力充沛的时段
            3. 工作效率：考虑用户的工作习惯和生理规律
            4. 健康因素：确保适当的休息和调整时间

            返回JSON数组，每个建议包含：
            {
              "title": "建议的日程标题",
              "suggestedStartTime": "建议的开始时间",
              "suggestedEndTime": "建议的结束时间",
              "priority": "优先级",
              "reasoning": "建议原因"
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
    let recommendations: ScheduleRecommendation[];

    try {
      recommendations = JSON.parse(data.choices[0].message.content);
      if (!Array.isArray(recommendations)) {
        throw new Error("Invalid recommendations format");
      }
    } catch (e) {
      console.error("Failed to parse AI recommendations:", data.choices[0].message.content);
      throw new Error("Failed to parse AI response");
    }

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
            返回JSON格式：{ "priority": "high" | "normal" | "low", "explanation": "分析说明" }`
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
    let result: PriorityAnalysis;

    try {
      result = JSON.parse(data.choices[0].message.content);
      if (!result.priority || !result.explanation) {
        throw new Error("Invalid response format");
      }
    } catch (e) {
      console.error("Failed to parse AI priority analysis:", data.choices[0].message.content);
      throw new Error("Failed to parse AI response");
    }

    return result;
  } catch (error) {
    console.error("Priority analysis failed:", error);
    throw new Error("Failed to analyze schedule priority");
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
    let advice: ProductivityAdvice;

    try {
      advice = JSON.parse(data.choices[0].message.content);
      if (!advice.summary || !advice.timeBalance || !advice.productivity || !advice.health || typeof advice.score !== 'number') {
        throw new Error("Invalid advice format received from AI");
      }
    } catch (e) {
      console.error("Failed to parse AI advice:", data.choices[0].message.content);
      throw new Error("Failed to parse AI response");
    }

    return advice;
  } catch (error) {
    console.error("AI analysis failed:", error);
    throw new Error("Failed to generate productivity advice");
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