import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import express from "express";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { upload, saveUploadedFile, imageToBase64 } from "./services/upload";
import { analyzeIssue, detectDuplicateIssues } from "./services/openai";
import { 
  insertIssueSchema, 
  insertCommentSchema, 
  updateIssueStatusSchema,
  type IssueWithDetails 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserWithDepartment(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Department routes
  app.get('/api/departments', async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  // Issue routes
  app.post('/api/issues', isAuthenticated, upload.array('images', 5), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const issueData = insertIssueSchema.parse({
        ...req.body,
        reportedById: userId,
        latitude: req.body.latitude ? parseFloat(req.body.latitude) : undefined,
        longitude: req.body.longitude ? parseFloat(req.body.longitude) : undefined,
      });

      // Process uploaded images
      const images = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const uploadedFile = await saveUploadedFile(file);
          images.push(uploadedFile);
        }
      }

      // AI analysis
      let aiAnalysis;
      const firstImageBase64 = req.files?.[0] ? imageToBase64(req.files[0].buffer) : undefined;
      
      try {
        aiAnalysis = await analyzeIssue(issueData.description, firstImageBase64);
      } catch (error) {
        console.error("AI analysis failed:", error);
      }

      // Check for duplicates
      const nearbyIssues = await storage.getNearbyIssues(
        issueData.latitude || 0,
        issueData.longitude || 0,
        1 // 1km radius
      );

      let duplicateCheck;
      try {
        duplicateCheck = await detectDuplicateIssues(
          issueData.description,
          issueData.location,
          nearbyIssues.map(issue => ({
            title: issue.title,
            description: issue.description,
            location: issue.location,
          }))
        );
      } catch (error) {
        console.error("Duplicate detection failed:", error);
      }

      // Create issue with AI enhancements
      const enhancedIssueData = {
        ...issueData,
        title: aiAnalysis?.title || issueData.title || issueData.description.slice(0, 60),
        category: aiAnalysis?.category || issueData.category,
        priority: aiAnalysis?.priority || 'medium',
        aiSummary: aiAnalysis?.summary,
        aiTags: aiAnalysis?.tags || [],
        images,
      };

      const issue = await storage.createIssue(enhancedIssueData);

      // Add images to database
      if (images.length > 0) {
        for (const img of images) {
          await storage.addIssueImage({
            issueId: issue.id,
            ...img,
            uploadedById: userId,
          });
        }
      }

      res.status(201).json({
        issue,
        aiAnalysis,
        duplicateWarning: duplicateCheck?.isDuplicate ? {
          message: "Similar issues found in the area",
          similarIssues: duplicateCheck.similarIssues,
          confidence: duplicateCheck.confidenceScore,
        } : undefined,
      });
    } catch (error) {
      console.error("Error creating issue:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create issue" });
      }
    }
  });

  app.get('/api/issues', async (req, res) => {
    try {
      const {
        status,
        category,
        departmentId,
        reportedById,
        assignedToId,
        limit = '20',
        offset = '0',
      } = req.query;

      const issues = await storage.getIssues({
        status: status as string,
        category: category as string,
        departmentId: departmentId as string,
        reportedById: reportedById as string,
        assignedToId: assignedToId as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json(issues);
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  app.get('/api/issues/:id', async (req, res) => {
    try {
      const issue = await storage.getIssue(req.params.id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      res.json(issue);
    } catch (error) {
      console.error("Error fetching issue:", error);
      res.status(500).json({ message: "Failed to fetch issue" });
    }
  });

  app.patch('/api/issues/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUserWithDepartment(req.user.claims.sub);
      if (!user || !['admin', 'department_head', 'field_worker'].includes(user.role!)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const updateData = updateIssueStatusSchema.parse(req.body);
      updateData.assignedToId = updateData.assignedToId || req.user.claims.sub;

      const issue = await storage.updateIssueStatus(req.params.id, updateData);
      res.json(issue);
    } catch (error) {
      console.error("Error updating issue status:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update issue" });
      }
    }
  });

  // Issue interaction routes
  app.post('/api/issues/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const commentData = insertCommentSchema.parse({
        ...req.body,
        issueId: req.params.id,
        userId: req.user.claims.sub,
      });

      const comment = await storage.addComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error adding comment:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to add comment" });
      }
    }
  });

  app.post('/api/issues/:id/upvote', isAuthenticated, async (req: any, res) => {
    try {
      const result = await storage.toggleUpvote(req.params.id, req.user.claims.sub);
      res.json(result);
    } catch (error) {
      console.error("Error toggling upvote:", error);
      res.status(500).json({ message: "Failed to toggle upvote" });
    }
  });

  // User-specific routes
  app.get('/api/users/me/issues', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const issues = await storage.getIssues({ reportedById: userId });
      res.json(issues);
    } catch (error) {
      console.error("Error fetching user issues:", error);
      res.status(500).json({ message: "Failed to fetch user issues" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUserWithDepartment(req.user.claims.sub);
      const departmentId = user?.role === 'citizen' ? undefined : user?.departmentId;
      
      const stats = await storage.getIssueStats(departmentId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Location-based routes
  app.get('/api/issues/nearby', async (req, res) => {
    try {
      const { lat, lng, radius = '5' } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }

      const issues = await storage.getNearbyIssues(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseFloat(radius as string)
      );

      res.json(issues);
    } catch (error) {
      console.error("Error fetching nearby issues:", error);
      res.status(500).json({ message: "Failed to fetch nearby issues" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
