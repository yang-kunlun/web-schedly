import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { schedules } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";
import { log } from "./vite";

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

  // Create a new schedule
  app.post("/api/schedules", async (req, res, next) => {
    try {
      const newSchedule = await db
        .insert(schedules)
        .values({
          ...req.body,
          startTime: new Date(req.body.startTime),
          endTime: new Date(req.body.endTime),
        })
        .returning();
      res.status(201).json(newSchedule[0]);
    } catch (error) {
      next(error);
    }
  });

  // Update a schedule
  app.patch("/api/schedules/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }

      const updatedSchedule = await db
        .update(schedules)
        .set({
          ...req.body,
          startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
          endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
        })
        .where(eq(schedules.id, parseInt(id)))
        .returning();

      if (!updatedSchedule.length) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      res.json(updatedSchedule[0]);
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