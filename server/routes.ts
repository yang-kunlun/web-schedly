import type { Express, Request, Response, NextFunction } from "express";
import { db } from "@db";
import { schedules, users, type Schedule, type User } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";
import { log } from "./vite";
import {
  analyzeSchedule,
  getProductivityAdvice,
  analyzePriority,
  getScheduleRecommendations,
  analyzeTimeBlock,
  analyzeOptimalIntervals
} from "./services/ai";
import { detectScheduleConflicts } from "./services/schedule-conflict";
import { getNotificationService } from "./services/notification";
import fs from "fs/promises";
import path from "path";
import { createServer } from 'http';
import { type Server } from "http";
import { setupAuth } from "./auth";

// 扩展Request类型以包含认证用户信息
interface AuthenticatedRequest extends Request {
  user?: User;
  isAuthenticated(): boolean;
}

export function registerRoutes(app: Express): Server {
  // 设置认证路由和中间件
  setupAuth(app);

  // 验证用户是否登录的中间件
  const requireAuth = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "请先登录" });
    }
    next();
  };

  // Get schedules for a specific date
  app.get("/api/schedules", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const date = new Date(req.query.date as string);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const result = await db.query.schedules.findMany({
        where: and(
          eq(schedules.userId, (req.user as User)?.id),
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
  app.post("/api/schedules/check-conflicts", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { schedule } = req.body as { schedule: Partial<Schedule> };
      if (!schedule || !schedule.startTime || !schedule.endTime) {
        return res.status(400).json({ message: "Invalid schedule data" });
      }

      const date = new Date(schedule.startTime);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const existingSchedules = await db.query.schedules.findMany({
        where: and(
          eq(schedules.userId, (req.user as User)?.id),
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
  app.get("/api/schedules/advice", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const date = new Date(req.query.date as string);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const schedulesList = await db.query.schedules.findMany({
        where: and(
          eq(schedules.userId, (req.user as User)?.id),
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

  // Create a new schedule
  app.post("/api/schedules", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const newSchedule: Omit<Schedule, "id" | "createdAt" | "updatedAt"> = {
        ...req.body,
        userId: (req.user as User)?.id,
      };

      const date = new Date(newSchedule.startTime);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const existingSchedules = await db.query.schedules.findMany({
        where: and(
          eq(schedules.userId, (req.user as User)?.id),
          gte(schedules.startTime, dayStart),
          lte(schedules.startTime, dayEnd)
        )
      });

      const conflicts = detectScheduleConflicts(newSchedule, existingSchedules);
      const priorityAnalysis = await analyzePriority(
        newSchedule as Schedule,
        existingSchedules
      );

      const timeBlockAnalysis = await analyzeTimeBlock(
        newSchedule as Schedule,
        existingSchedules
      );

      const created = await db
        .insert(schedules)
        .values({
          ...newSchedule,
          priority: priorityAnalysis.priority,
          timeBlockCategory: timeBlockAnalysis.category,
          timeBlockEfficiency: timeBlockAnalysis.efficiencyScore,
          aiSuggestions: {
            recommendation: timeBlockAnalysis.suggestions.optimization.join(", "),
            efficiency: timeBlockAnalysis.efficiencyScore,
            nextActions: timeBlockAnalysis.suggestions.timing
          },
        })
        .returning();

      getNotificationService().notifyScheduleCreated(created[0].title);

      res.status(201).json({
        schedule: created[0],
        conflicts,
        priorityAnalysis,
        timeBlockAnalysis
      });
    } catch (error) {
      next(error);
    }
  });

  // Update a schedule
  app.patch("/api/schedules/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }

      // 确保用户只能修改自己的日程
      const schedule = await db.query.schedules.findFirst({
        where: and(
          eq(schedules.id, parseInt(id)),
          eq(schedules.userId, (req.user as User)?.id)
        )
      });

      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found or unauthorized" });
      }

      const updateData = req.body as Partial<Schedule>;
      let conflicts = null;
      let priorityAnalysis = null;
      let timeBlockAnalysis = null;

      if (updateData.startTime || updateData.endTime || updateData.title || updateData.remarks) {
        const date = new Date(updateData.startTime || schedule.startTime);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const existingSchedules = await db.query.schedules.findMany({
          where: and(
            eq(schedules.userId, (req.user as User)?.id),
            gte(schedules.startTime, dayStart),
            lte(schedules.startTime, dayEnd)
          )
        });

        const updatedSchedule = { ...schedule, ...updateData };

        if (updateData.startTime || updateData.endTime) {
          conflicts = detectScheduleConflicts(
            updatedSchedule,
            existingSchedules.filter(s => s.id !== parseInt(id))
          );
        }

        priorityAnalysis = await analyzePriority(
          updatedSchedule,
          existingSchedules.filter(s => s.id !== parseInt(id))
        );

        timeBlockAnalysis = await analyzeTimeBlock(
          updatedSchedule,
          existingSchedules.filter(s => s.id !== parseInt(id))
        );

        updateData.priority = priorityAnalysis.priority;
        updateData.timeBlockCategory = timeBlockAnalysis.category;
        updateData.timeBlockEfficiency = timeBlockAnalysis.efficiencyScore;
        updateData.aiSuggestions = {
          recommendation: timeBlockAnalysis.suggestions.optimization.join(", "),
          efficiency: timeBlockAnalysis.efficiencyScore,
          nextActions: timeBlockAnalysis.suggestions.timing
        };
      }

      const updatedSchedule = await db
        .update(schedules)
        .set({
          ...updateData,
          startTime: updateData.startTime ? new Date(updateData.startTime) : undefined,
          endTime: updateData.endTime ? new Date(updateData.endTime) : undefined,
          updatedAt: new Date(),
        })
        .where(and(
          eq(schedules.id, parseInt(id)),
          eq(schedules.userId, (req.user as User)?.id)
        ))
        .returning();

      if (!updatedSchedule.length) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      getNotificationService().notifyScheduleUpdated(updatedSchedule[0].title);

      res.json({
        schedule: updatedSchedule[0],
        conflicts,
        priorityAnalysis,
        timeBlockAnalysis
      });
    } catch (error) {
      next(error);
    }
  });

  // Delete a schedule
  app.delete("/api/schedules/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }

      // 获取日程信息用于通知，同时验证用户权限
      const schedule = await db.query.schedules.findFirst({
        where: and(
          eq(schedules.id, parseInt(id)),
          eq(schedules.userId, (req.user as User)?.id)
        )
      });

      if (schedule) {
        await db.delete(schedules).where(and(
          eq(schedules.id, parseInt(id)),
          eq(schedules.userId, (req.user as User)?.id)
        ));
        // 发送删除通知
        getNotificationService().notifyScheduleDeleted(schedule.title);
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Theme related routes
  app.post("/api/theme", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { primary, variant, appearance } = req.body as {
        primary: string;
        variant: 'professional' | 'tint' | 'vibrant';
        appearance: 'light' | 'dark' | 'system';
      };

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

  // Get schedule recommendations
  app.get("/api/schedules/recommendations", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const date = new Date(req.query.date as string);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const schedulesList = await db.query.schedules.findMany({
        where: and(
          eq(schedules.userId, (req.user as User)?.id),
          gte(schedules.startTime, dayStart),
          lte(schedules.startTime, dayEnd)
        ),
        orderBy: schedules.startTime,
      });

      const recommendations = await getScheduleRecommendations(schedulesList, date);
      res.json(recommendations);
    } catch (error) {
      next(error);
    }
  });

  // Analyze schedule with AI
  app.post("/api/schedules/analyze", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { description } = req.body as { description: string };
      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }

      const suggestion = await analyzeSchedule(description);
      res.json(suggestion);
    } catch (error) {
      next(error);
    }
  });

  // Analyze time block
  app.post("/api/schedules/analyze-timeblock", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { schedule } = req.body as { schedule: Schedule };
      if (!schedule) {
        return res.status(400).json({ message: "Schedule data is required" });
      }

      const date = new Date(schedule.startTime);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const existingSchedules = await db.query.schedules.findMany({
        where: and(
          eq(schedules.userId, (req.user as User)?.id),
          gte(schedules.startTime, dayStart),
          lte(schedules.startTime, dayEnd)
        )
      });

      const analysis = await analyzeTimeBlock(schedule, existingSchedules);
      res.json(analysis);
    } catch (error) {
      next(error);
    }
  });

  // Analyze optimal time block intervals
  app.post("/api/schedules/analyze-intervals", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { schedule, userPreferences } = req.body as {
        schedule: Schedule;
        userPreferences?: {
          preferredWorkDuration?: number;
          preferredBreakDuration?: number;
          energyPeakHours?: number[];
        };
      };

      if (!schedule) {
        return res.status(400).json({ message: "Schedule data is required" });
      }

      const date = new Date(schedule.startTime);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const existingSchedules = await db.query.schedules.findMany({
        where: and(
          eq(schedules.userId, (req.user as User)?.id),
          gte(schedules.startTime, dayStart),
          lte(schedules.startTime, dayEnd)
        )
      });

      const analysis = await analyzeOptimalIntervals(schedule, existingSchedules, userPreferences);
      res.json(analysis);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/theme/appearance", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { appearance } = req.body as { appearance: 'light' | 'dark' | 'system' };
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