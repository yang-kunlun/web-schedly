import { pgTable, text, timestamp, boolean, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const insertScheduleSchema = createInsertSchema(schedules);
export const selectScheduleSchema = createSelectSchema(schedules);
export type InsertSchedule = typeof schedules.$inferInsert;
export type SelectSchedule = typeof schedules.$inferSelect;

// Export Schedule type alias for convenience
export type Schedule = SelectSchedule;