import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { schedules } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";
import { log } from "./vite";
import { analyzeSchedule, getProductivityAdvice } from "./services/ai";
import { detectScheduleConflicts } from "./services/schedule-conflict";

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

  // Create a new schedule with conflict check
  app.post("/api/schedules", async (req, res, next) => {
    try {
      const newSchedule = req.body;

      // Check for conflicts
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

      // 添加冲突信息到新日程
      const scheduleWithConflicts = {
        ...newSchedule,
        conflictInfo: conflicts.hasConflict ? conflicts : null,
      };

      const created = await db
        .insert(schedules)
        .values({
          ...scheduleWithConflicts,
          startTime: new Date(scheduleWithConflicts.startTime),
          endTime: new Date(scheduleWithConflicts.endTime),
        })
        .returning();

      res.status(201).json({
        schedule: created[0],
        conflicts
      });
    } catch (error) {
      next(error);
    }
  });

  // Update a schedule with conflict check
  app.patch("/api/schedules/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }

      const updateData = req.body;

      // Check for conflicts if time is being updated
      let conflicts = null;
      if (updateData.startTime || updateData.endTime) {
        const date = new Date(updateData.startTime || new Date());
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const existingSchedules = await db.query.schedules.findMany({
          where: and(
            gte(schedules.startTime, dayStart),
            lte(schedules.startTime, dayEnd)
          )
        });

        conflicts = detectScheduleConflicts({ ...updateData, id: parseInt(id) }, existingSchedules);
        updateData.conflictInfo = conflicts.hasConflict ? conflicts : null;
      }

      const updatedSchedule = await db
        .update(schedules)
        .set({
          ...updateData,
          startTime: updateData.startTime ? new Date(updateData.startTime) : undefined,
          endTime: updateData.endTime ? new Date(updateData.endTime) : undefined,
        })
        .where(eq(schedules.id, parseInt(id)))
        .returning();

      if (!updatedSchedule.length) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      res.json({
        schedule: updatedSchedule[0],
        conflicts
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

  const httpServer = createServer(app);
  return httpServer;
}