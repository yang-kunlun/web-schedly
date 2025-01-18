import { pgTable, text, timestamp, boolean, serial, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from 'zod';
import { relations } from 'drizzle-orm';

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
  }>(),
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
  aiSuggestions: jsonb("ai_suggestions"),
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

export const insertScheduleSchema = createInsertSchema(schedules);
export const selectScheduleSchema = createSelectSchema(schedules);

// 导出类型
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;
export type SelectSchedule = typeof schedules.$inferSelect;

// 导出Schedule类型别名方便使用
export type Schedule = SelectSchedule;
export type User = SelectUser;