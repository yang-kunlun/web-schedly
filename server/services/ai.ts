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
        startTime: schedule.startTime.toISOString(),
        endTime: schedule.endTime.toISOString(),
        location: schedule.location,
        remarks: schedule.remarks,
      },
      existingSchedules: existingSchedules.map(s => ({
        title: s.title,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
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
            content: `You are a schedule priority analyzer. Based on the schedule details and context, determine the appropriate priority level (high, normal, or low) and provide a brief explanation.
            Consider factors such as:
            1. Urgency based on time
            2. Importance of the task
            3. Dependencies with other schedules
            4. Impact on overall productivity
            Respond with JSON in this format: { "priority": "high" | "normal" | "low", "explanation": "string" }`
          },
          { 
            role: "user", 
            content: JSON.stringify(context)
          }
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
    const schedulesData = schedules.map(schedule => ({
      title: schedule.title,
      startTime: schedule.startTime.toISOString(),
      endTime: schedule.endTime.toISOString(),
      isDone: schedule.isDone,
      priority: schedule.priority,
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
          { 
            role: "user", 
            content: JSON.stringify({
              schedules: schedulesData,
              currentTime: new Date().toISOString()
            })
          }
        ],
        temperature: 0.7,
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
    } catch (e) {
      console.error("Failed to parse AI advice:", data.choices[0].message.content);
      throw new Error("Failed to parse AI response");
    }

    if (!advice.summary || !advice.timeBalance || !advice.productivity || !advice.health || typeof advice.score !== 'number') {
      throw new Error("Invalid advice format received from AI");
    }

    return advice;
  } catch (error) {
    console.error("AI analysis failed:", error);
    throw new Error("Failed to generate productivity advice");
  }
}