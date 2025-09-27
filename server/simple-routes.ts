import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import express from "express";
import { getStorage } from "./storage-adapter";

export async function registerSimpleRoutes(app: Express): Promise<Server> {
  
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'CrowdCare API is running' });
  });

  // Get all issues
  app.get('/api/issues', async (req, res) => {
    try {
      const { status, category } = req.query;
      const storage = await getStorage();
      
      const issues = await storage.getIssues({
        status: status as string,
        category: category as string
      });
      
      res.json(issues);
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  // Get single issue
  app.get('/api/issues/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const storage = await getStorage();
      
      const issue = await storage.getIssue(id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      
      res.json(issue);
    } catch (error) {
      console.error("Error fetching issue:", error);
      res.status(500).json({ message: "Failed to fetch issue" });
    }
  });

  // Create new issue
  app.post('/api/issues', express.json(), async (req, res) => {
    try {
      const issueData = {
        title: req.body.title || 'Untitled Issue',
        description: req.body.description || '',
        category: req.body.category || 'Other',
        status: 'open',
        priority: req.body.priority || 'medium',
        location: req.body.location || 'Unknown Location',
        coordinates: req.body.coordinates || { lat: 0, lng: 0 },
        reportedById: 'demo-user',
        images: [],
        upvotes: 0,
        comments: []
      };

      const storage = await getStorage();
      const newIssue = await storage.createIssue(issueData);
      
      res.status(201).json(newIssue);
    } catch (error) {
      console.error("Error creating issue:", error);
      res.status(500).json({ message: "Failed to create issue" });
    }
  });

  // Get departments
  app.get('/api/departments', async (req, res) => {
    try {
      const storage = await getStorage();
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  // Get categories
  app.get('/api/categories', async (req, res) => {
    try {
      const storage = await getStorage();
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Get analytics/stats
  app.get('/api/analytics/stats', async (req, res) => {
    try {
      const storage = await getStorage();
      const stats = await storage.getIssueStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Update issue status
  app.put('/api/issues/:id/status', express.json(), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      const storage = await getStorage();
      const updatedIssue = await storage.updateIssue(id, { 
        status: status || 'in_progress',
        notes: notes || '',
        updatedAt: new Date().toISOString()
      });
      
      if (!updatedIssue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      
      res.json(updatedIssue);
    } catch (error) {
      console.error("Error updating issue:", error);
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  // Mock authentication endpoints
  app.post('/api/auth/citizen/login', express.json(), async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Mock authentication - accept any credentials
      const mockUser = {
        id: 'demo-citizen',
        email: email || 'citizen@example.com',
        full_name: 'Demo Citizen',
        mobile_number: '+1234567890',
        role: 'citizen',
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString()
      };
      
      res.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        token_type: 'Bearer',
        user: mockUser
      });
    } catch (error) {
      console.error("Error in citizen login:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  app.post('/api/auth/admin/login', express.json(), async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Mock authentication - accept any credentials
      const mockUser = {
        id: 'demo-admin',
        email: email || 'admin@example.com',
        full_name: 'Demo Admin',
        mobile_number: '+1234567891',
        role: 'admin',
        admin_id: 'ADM001',
        municipality_name: 'Demo City',
        department_name: 'Public Works',
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString()
      };
      
      res.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        token_type: 'Bearer',
        user: mockUser
      });
    } catch (error) {
      console.error("Error in admin login:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Get current user (mock)
  app.get('/api/auth/me', async (req, res) => {
    try {
      const mockUser = {
        id: 'demo-user',
        email: 'user@example.com',
        full_name: 'Demo User',
        mobile_number: '+1234567890',
        role: 'citizen',
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString()
      };
      
      res.json(mockUser);
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
