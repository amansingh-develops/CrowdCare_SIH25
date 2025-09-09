import { z } from "zod";

// MongoDB Schema Definitions
export interface User {
  _id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: 'citizen' | 'admin' | 'department_head' | 'field_worker';
  departmentId?: string;
  phoneNumber?: string;
  contributionScore?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Department {
  _id?: string;
  name: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive?: boolean;
  createdAt?: Date;
}

export interface Issue {
  _id?: string;
  title: string;
  description: string;
  category: 'roads_transportation' | 'public_safety' | 'utilities' | 'parks_recreation' | 'sanitation' | 'other';
  status: 'new' | 'in_progress' | 'resolved' | 'closed' | 'duplicate';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  location: string;
  latitude?: number;
  longitude?: number;
  reportedById: string;
  assignedToId?: string;
  departmentId?: string;
  aiSummary?: string;
  aiTags?: string[];
  upvotes?: number;
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IssueImage {
  _id?: string;
  issueId: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  isEvidence?: boolean;
  uploadedById: string;
  createdAt?: Date;
}

export interface IssueComment {
  _id?: string;
  issueId: string;
  userId: string;
  comment: string;
  isInternal?: boolean;
  createdAt?: Date;
}

export interface IssueUpvote {
  _id?: string;
  issueId: string;
  userId: string;
  createdAt?: Date;
}

// Extended types with relations
export interface IssueWithDetails extends Issue {
  reportedBy: User;
  assignedTo?: User;
  department?: Department;
  images: IssueImage[];
  comments: IssueComment[];
  upvotes: number;
  _count?: {
    upvotes: number;
    comments: number;
  };
}

export interface UserWithDepartment extends User {
  department?: Department;
}

// Zod schemas for validation
export const upsertUserSchema = z.object({
  _id: z.string().optional(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
  role: z.enum(['citizen', 'admin', 'department_head', 'field_worker']),
  departmentId: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export const insertIssueSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.enum(['roads_transportation', 'public_safety', 'utilities', 'parks_recreation', 'sanitation', 'other']),
  location: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  reportedById: z.string(),
  images: z.array(z.object({
    fileName: z.string(),
    filePath: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
  })).optional(),
});

export const insertCommentSchema = z.object({
  issueId: z.string(),
  comment: z.string(),
  isInternal: z.boolean().optional(),
});

export const updateIssueStatusSchema = z.object({
  status: z.enum(['new', 'in_progress', 'resolved', 'closed', 'duplicate']),
  assignedToId: z.string().optional(),
  departmentId: z.string().optional(),
  comment: z.string().optional(),
});

// Type exports
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type UpdateIssueStatus = z.infer<typeof updateIssueStatusSchema>;
