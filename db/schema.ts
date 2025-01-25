import { pgTable, text, timestamp, boolean, serial, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from 'zod';
import { relations, type InferModel } from 'drizzle-orm';

// 用户表定义
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
  }>().default({ 
    theme: 'system', 
    notifications: true, 
    defaultView: 'week' 
  }),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 日程表定义
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  remarks: text("remarks"),
  isDone: boolean("is_done").default(false).notNull(),
  priority: text("priority").default("normal").$type<"high" | "normal" | "low">().notNull(),
  timeBlockCategory: text("time_block_category").$type<"work" | "meeting" | "break" | "focus" | "other">().default("other").notNull(),
  timeBlockEfficiency: integer("time_block_efficiency"),
  aiSuggestions: jsonb("ai_suggestions").$type<{
    recommendation?: string;
    efficiency?: number;
    nextActions?: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 定义表关系
export const usersRelations = relations(users, ({ many }) => ({
  schedules: many(schedules)
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  user: one(users, {
    fields: [schedules.userId],
    references: [users.id],
  }),
}));

// Schema验证
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

export const insertScheduleSchema = createInsertSchema(schedules, {
  priority: z.enum(['high', 'normal', 'low']),
  timeBlockCategory: z.enum(['work', 'meeting', 'break', 'focus', 'other']),
});

export const selectScheduleSchema = createSelectSchema(schedules);

// 导出类型
export type InsertUser = InferModel<typeof users, "insert">;
export type SelectUser = InferModel<typeof users, "select">;
export type InsertSchedule = InferModel<typeof schedules, "insert">;
export type SelectSchedule = InferModel<typeof schedules, "select">;

// 导出Schedule类型别名方便使用
export type Schedule = SelectSchedule;
// 修改User类型定义，确保它与Express.User接口兼容
export type User = Omit<InferModel<typeof users, "select">, "password">;
export type UserWithPassword = InferModel<typeof users, "select">;