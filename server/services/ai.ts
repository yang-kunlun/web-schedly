import { PROMPTS } from "../constants";
import { Schedule } from "@db/schema";

interface ScheduleSuggestion {
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  remarks?: string;
}

interface ProductivityAdvice {
  summary: string;
  timeBalance: string;
  productivity: string;
  health: string;
  score: number;
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
      throw new Error("Failed to parse AI response");
    }

    return suggestion;
  } catch (error) {
    console.error("AI analysis failed:", error);
    throw new Error("Failed to analyze schedule with AI");
  }
}

export async function getProductivityAdvice(schedules: Schedule[]): Promise<ProductivityAdvice> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }

  try {
    // 将日程数据转换为易于AI理解的格式
    const schedulesData = schedules.map(schedule => ({
      title: schedule.title,
      startTime: schedule.startTime.toISOString(),
      endTime: schedule.endTime.toISOString(),
      isDone: schedule.isDone,
    }));

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: PROMPTS.PRODUCTIVITY_ADVICE },
          { role: "user", content: JSON.stringify(schedulesData) }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    let advice: ProductivityAdvice;

    try {
      advice = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      throw new Error("Failed to parse AI response");
    }

    return advice;
  } catch (error) {
    console.error("AI analysis failed:", error);
    throw new Error("Failed to generate productivity advice");
  }
}