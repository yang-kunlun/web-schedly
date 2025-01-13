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
    body: JSON.stringify({ schedule }),
  });

  if (!response.ok) {
    throw new Error("Failed to check schedule conflicts");
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
    body: JSON.stringify(schedule),
  });
  if (!response.ok) {
    throw new Error("Failed to create schedule");
  }
  return response.json();
}

export async function updateSchedule(id: number, schedule: Partial<Schedule>) {
  const response = await fetch(`${API_BASE}/schedules/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(schedule),
  });
  if (!response.ok) {
    throw new Error("Failed to update schedule");
  }
  return response.json();
}

export async function deleteSchedule(id: number) {
  const response = await fetch(`${API_BASE}/schedules/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to delete schedule");
  }
}