import { z } from 'zod';

export type Priority = 'high' | 'normal' | 'low';

export interface Schedule {
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  remarks?: string;
  isDone: boolean;
  icon?: string;
  priority?: Priority;
  conflictInfo?: {
    hasConflict: boolean;
    conflictingSchedules: Array<{
      id: number;
      title: string;
      startTime: string;
      endTime: string;
      overlapDuration: number;
    }>;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  };
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
  priority: z.enum(['high', 'normal', 'low']).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});