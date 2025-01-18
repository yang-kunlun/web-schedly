import { pgTable, text, timestamp, boolean, serial, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from 'zod';

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  location: text("location"),
  remarks: text("remarks"),
  isDone: boolean("is_done").default(false).notNull(),
  icon: text("icon"),
  conflictInfo: jsonb("conflict_info"), // 存储冲突信息的JSON字段
  priority: text("priority").default("normal").notNull(), // 日程优先级：low, normal, high

  // 新增AI时间块规划相关字段
  timeBlockCategory: text("time_block_category").default("other").notNull(), // 时间块类型：work, meeting, break, focus, other
  timeBlockEfficiency: integer("time_block_efficiency"), // 时间块效率评分 (0-100)
  aiSuggestions: jsonb("ai_suggestions"), // AI优化建议
  timeBlockPriority: integer("time_block_priority"), // 优先级评分 (0-100)

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

// 创建用于验证的zod schema
const timeBlockCategoryEnum = z.enum(["work", "meeting", "break", "focus", "other"]);
const priorityEnum = z.enum(["low", "normal", "high"]);

export const insertScheduleSchema = createInsertSchema(schedules, {
  timeBlockCategory: timeBlockCategoryEnum,
  priority: priorityEnum,
  timeBlockEfficiency: z.number().min(0).max(100).optional(),
  timeBlockPriority: z.number().min(0).max(100).optional(),
});

export const selectScheduleSchema = createSelectSchema(schedules, {
  timeBlockCategory: timeBlockCategoryEnum,
  priority: priorityEnum,
  timeBlockEfficiency: z.number().min(0).max(100).optional(),
  timeBlockPriority: z.number().min(0).max(100).optional(),
});

export type InsertSchedule = typeof schedules.$inferInsert;
export type SelectSchedule = typeof schedules.$inferSelect;

// Export Schedule type alias for convenience
export type Schedule = SelectSchedule;