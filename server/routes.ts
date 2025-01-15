import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { schedules, type Schedule } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";
import { log } from "./vite";
import { analyzeSchedule, getProductivityAdvice, analyzePriority } from "./services/ai";
import { detectScheduleConflicts } from "./services/schedule-conflict";
import fs from "fs/promises";
import path from "path";

export function registerRoutes(app: Express): Server {
  // Get schedules for a specific date
  app.get("/api/schedules", async (req, res, next) => {
    try {
      const date = new Date(req.query.date as string);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const result = await db.query.schedules.findMany({
        where: and(
          gte(schedules.startTime, dayStart),
          lte(schedules.startTime, dayEnd)
        ),
        orderBy: schedules.startTime,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Check schedule conflicts
  app.post("/api/schedules/check-conflicts", async (req, res, next) => {
    try {
      const { schedule } = req.body;
      if (!schedule || !schedule.startTime || !schedule.endTime) {
        return res.status(400).json({ message: "Invalid schedule data" });
      }

      const date = new Date(schedule.startTime);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const existingSchedules = await db.query.schedules.findMany({
        where: and(
          gte(schedules.startTime, dayStart),
          lte(schedules.startTime, dayEnd)
        )
      });

      const conflicts = detectScheduleConflicts(schedule, existingSchedules);
      res.json(conflicts);
    } catch (error) {
      next(error);
    }
  });

  // Get productivity advice
  app.get("/api/schedules/advice", async (req, res, next) => {
    try {
      const date = new Date(req.query.date as string);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const schedulesList = await db.query.schedules.findMany({
        where: and(
          gte(schedules.startTime, dayStart),
          lte(schedules.startTime, dayEnd)
        ),
        orderBy: schedules.startTime,
      });

      const advice = await getProductivityAdvice(schedulesList);
      res.json(advice);
    } catch (error) {
      next(error);
    }
  });

  // Analyze schedule with AI
  app.post("/api/schedules/analyze", async (req, res, next) => {
    try {
      const { description } = req.body;
      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }

      const suggestion = await analyzeSchedule(description);
      res.json(suggestion);
    } catch (error) {
      next(error);
    }
  });

  // Create a new schedule with priority analysis
  app.post("/api/schedules", async (req, res, next) => {
    try {
      const newSchedule = req.body as Omit<Schedule, "id" | "createdAt" | "updatedAt">;

      const date = new Date(newSchedule.startTime);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const existingSchedules = await db.query.schedules.findMany({
        where: and(
          gte(schedules.startTime, dayStart),
          lte(schedules.startTime, dayEnd)
        )
      });

      const conflicts = detectScheduleConflicts(newSchedule, existingSchedules);

      // 分析优先级
      const priorityAnalysis = await analyzePriority(
        { ...newSchedule, id: -1 } as Schedule,
        existingSchedules
      );

      // 添加优先级信息到新日程
      const scheduleWithMetadata = {
        ...newSchedule,
        conflictInfo: conflicts.hasConflict ? conflicts : null,
        priority: priorityAnalysis.priority,
      };

      const created = await db
        .insert(schedules)
        .values({
          ...scheduleWithMetadata,
          startTime: new Date(scheduleWithMetadata.startTime),
          endTime: new Date(scheduleWithMetadata.endTime),
        })
        .returning();

      res.status(201).json({
        schedule: created[0],
        conflicts,
        priorityAnalysis
      });
    } catch (error) {
      next(error);
    }
  });

  // Update a schedule with priority analysis
  app.patch("/api/schedules/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }

      const updateData = req.body as Partial<Schedule>;

      // Check for conflicts if time is being updated
      let conflicts = null;
      let priorityAnalysis = null;

      if (updateData.startTime || updateData.endTime || updateData.title || updateData.remarks) {
        const date = new Date(updateData.startTime || new Date());
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const existingSchedules = await db.query.schedules.findMany({
          where: and(
            gte(schedules.startTime, dayStart),
            lte(schedules.startTime, dayEnd)
          )
        });

        if (updateData.startTime || updateData.endTime) {
          conflicts = detectScheduleConflicts(
            { ...updateData, id: parseInt(id) } as Schedule,
            existingSchedules
          );
          updateData.conflictInfo = conflicts.hasConflict ? conflicts : null;
        }

        // 重新分析优先级
        const currentSchedule = await db.query.schedules.findFirst({
          where: eq(schedules.id, parseInt(id))
        });

        if (currentSchedule) {
          priorityAnalysis = await analyzePriority(
            { ...currentSchedule, ...updateData } as Schedule,
            existingSchedules.filter(s => s.id !== parseInt(id))
          );
          updateData.priority = priorityAnalysis.priority;
        }
      }

      const updatedSchedule = await db
        .update(schedules)
        .set({
          ...updateData,
          startTime: updateData.startTime ? new Date(updateData.startTime) : undefined,
          endTime: updateData.endTime ? new Date(updateData.endTime) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(schedules.id, parseInt(id)))
        .returning();

      if (!updatedSchedule.length) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      res.json({
        schedule: updatedSchedule[0],
        conflicts,
        priorityAnalysis
      });
    } catch (error) {
      next(error);
    }
  });

  // Delete a schedule
  app.delete("/api/schedules/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }

      await db.delete(schedules).where(eq(schedules.id, parseInt(id)));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Theme related routes
  app.post("/api/theme", async (req, res, next) => {
    try {
      const { primary, variant, appearance } = req.body;
      const themeConfigPath = path.resolve(process.cwd(), "theme.json");

      const currentTheme = JSON.parse(await fs.readFile(themeConfigPath, "utf-8"));
      const updatedTheme = {
        ...currentTheme,
        primary,
        variant,
        appearance
      };

      await fs.writeFile(themeConfigPath, JSON.stringify(updatedTheme, null, 2));
      res.status(200).json({ message: "Theme updated successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/theme/appearance", async (req, res, next) => {
    try {
      const { appearance } = req.body;
      const themeConfigPath = path.resolve(process.cwd(), "theme.json");

      const currentTheme = JSON.parse(await fs.readFile(themeConfigPath, "utf-8"));
      const updatedTheme = {
        ...currentTheme,
        appearance
      };

      await fs.writeFile(themeConfigPath, JSON.stringify(updatedTheme, null, 2));
      res.status(200).json({ message: "Theme appearance updated successfully" });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}