import { Schedule } from "@/types/schedule";

const API_BASE = "/api";

export async function getSchedules(date: Date): Promise<Schedule[]> {
  const response = await fetch(
    `${API_BASE}/schedules?date=${date.toISOString()}`,
    {
      credentials: "include",
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch schedules");
  }
  const data = await response.json();
  return data.map((schedule: any) => ({
    ...schedule,
    startTime: new Date(schedule.startTime),
    endTime: new Date(schedule.endTime),
    createdAt: new Date(schedule.createdAt),
    updatedAt: new Date(schedule.updatedAt),
  }));
}

export async function analyzeSchedule(description: string) {
  const response = await fetch(`${API_BASE}/schedules/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ description }),
  });

  if (!response.ok) {
    throw new Error("Failed to analyze schedule");
  }

  return response.json();
}

export async function checkScheduleConflicts(schedule: Partial<Schedule>) {
  const response = await fetch(`${API_BASE}/schedules/check-conflicts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ 
      schedule: {
        ...schedule,
        startTime: schedule.startTime?.toISOString(),
        endTime: schedule.endTime?.toISOString()
      } 
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to check schedule conflicts");
  }

  return response.json();
}

export async function getScheduleRecommendations(date: Date) {
  const response = await fetch(
    `${API_BASE}/schedules/recommendations?date=${date.toISOString()}`,
    {
      credentials: "include",
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch schedule recommendations");
  }
  return response.json();
}

export async function createSchedule(schedule: Omit<Schedule, "id" | "createdAt" | "updatedAt">) {
  const response = await fetch(`${API_BASE}/schedules`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      ...schedule,
      startTime: schedule.startTime.toISOString(),
      endTime: schedule.endTime.toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create schedule: ${errorText}`);
  }

  const data = await response.json();
  return {
    ...data,
    startTime: new Date(data.startTime),
    endTime: new Date(data.endTime),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

export async function updateSchedule(id: number, schedule: Partial<Schedule>) {
  const response = await fetch(`${API_BASE}/schedules/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      ...schedule,
      startTime: schedule.startTime?.toISOString(),
      endTime: schedule.endTime?.toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update schedule: ${errorText}`);
  }

  const data = await response.json();
  return {
    ...data,
    startTime: new Date(data.startTime),
    endTime: new Date(data.endTime),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

export async function deleteSchedule(id: number) {
  const response = await fetch(`${API_BASE}/schedules/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete schedule: ${errorText}`);
  }
}

export async function analyzeOptimalIntervals(
  schedule: Schedule,
  userPreferences?: {
    preferredWorkDuration?: number;
    preferredBreakDuration?: number;
    energyPeakHours?: number[];
  }
) {
  const response = await fetch(`${API_BASE}/schedules/analyze-intervals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ schedule, userPreferences }),
  });

  if (!response.ok) {
    throw new Error("Failed to analyze optimal intervals");
  }

  return response.json();
}