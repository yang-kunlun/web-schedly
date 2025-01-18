import { pgTable, text, timestamp, boolean, serial, jsonb, integer, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from 'zod';
import { relations } from 'drizzle-orm';

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  preferences: jsonb("preferences").$type<{
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    defaultView: 'day' | 'week' | 'month';
  }>(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  location: text("location"),
  remarks: text("remarks"),
  isDone: boolean("is_done").default(false).notNull(),
  icon: text("icon"),
  conflictInfo: jsonb("conflict_info"), // 存储冲突信息的JSON字段
  priority: text("priority").default("normal").notNull(), // 日程优先级：low, normal, high

  // AI时间块规划相关字段
  timeBlockCategory: text("time_block_category").default("other").notNull(), // 时间块类型：work, meeting, break, focus, other
  timeBlockEfficiency: integer("time_block_efficiency"), // 时间块效率评分 (0-100)
  aiSuggestions: jsonb("ai_suggestions"), // AI优化建议
  timeBlockPriority: integer("time_block_priority"), // 优先级评分 (0-100)

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

// 用于验证的zod schema
const timeBlockCategoryEnum = z.enum(["work", "meeting", "break", "focus", "other"]);
const priorityEnum = z.enum(["low", "normal", "high"]);

// Relations configuration
export const usersRelations = relations(users, ({ many }) => ({
  schedules: many(schedules)
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  user: one(users, {
    fields: [schedules.userId],
    references: [users.id],
  }),
}));

// User schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  password: z.string().min(8),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    notifications: z.boolean().default(true),
    defaultView: z.enum(['day', 'week', 'month']).default('week')
  }).optional(),
});

export const selectUserSchema = createSelectSchema(users);

// Schedule schemas
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

// Export types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;
export type SelectSchedule = typeof schedules.$inferSelect;

// Export Schedule type alias for convenience
export type Schedule = SelectSchedule;
export type User = SelectUser;