import { z } from 'zod';

export interface Schedule {
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  remarks?: string;
  isDone: boolean;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  hour: string;
  duration: number;
  completed: number;
  pending: number;
}

export interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export interface ProductivityStats {
  tasksTotal: number;
  tasksCompleted: number;
  taskCompletion: number;
  durationTotal: number;
  durationCompleted: number;
  durationCompletion: number;
}

export const scheduleSchema = z.object({
  id: z.number(),
  title: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  location: z.string().optional(),
  remarks: z.string().optional(),
  isDone: z.boolean(),
  icon: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});