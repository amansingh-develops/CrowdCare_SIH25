import { sql } from 'drizzle-orm';
import {
  index,
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: text("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums (using text for SQLite)
export const issueStatusEnum = ['new', 'in_progress', 'resolved', 'closed', 'duplicate'] as const;
export const priorityEnum = ['low', 'medium', 'high', 'urgent'] as const;
export const userRoleEnum = ['citizen', 'admin', 'department_head', 'field_worker'] as const;
export const categoryEnum = ['roads_transportation', 'public_safety', 'utilities', 'parks_recreation', 'sanitation', 'other'] as const;

// User storage table (required for Replit Auth)
export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").default('citizen'),
  departmentId: text("department_id"),
  phoneNumber: text("phone_number"),
  contributionScore: integer("contribution_score").default(0),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// Departments
export const departments = sqliteTable("departments", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  name: text("name").notNull(),
  description: text("description"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Issues
export const issues = sqliteTable("issues", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  status: text("status").default('new'),
  priority: text("priority").default('medium'),
  location: text("location").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  reportedById: text("reported_by_id").notNull(),
  assignedToId: text("assigned_to_id"),
  departmentId: text("department_id"),
  aiSummary: text("ai_summary"),
  aiTags: text("ai_tags"),
  upvotes: integer("upvotes").default(0),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// Issue Images
export const issueImages = sqliteTable("issue_images", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  issueId: text("issue_id").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  isEvidence: integer("is_evidence", { mode: 'boolean' }).default(false),
  uploadedById: text("uploaded_by_id").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Issue Comments/Updates
export const issueComments = sqliteTable("issue_comments", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  issueId: text("issue_id").notNull(),
  userId: text("user_id").notNull(),
  comment: text("comment").notNull(),
  isInternal: integer("is_internal", { mode: 'boolean' }).default(false),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Issue Upvotes
export const issueUpvotes = sqliteTable("issue_upvotes", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  issueId: text("issue_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  reportedIssues: many(issues, { relationName: "reportedBy" }),
  assignedIssues: many(issues, { relationName: "assignedTo" }),
  comments: many(issueComments),
  upvotes: many(issueUpvotes),
  uploadedImages: many(issueImages),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
  issues: many(issues),
}));

export const issuesRelations = relations(issues, ({ one, many }) => ({
  reportedBy: one(users, {
    fields: [issues.reportedById],
    references: [users.id],
    relationName: "reportedBy",
  }),
  assignedTo: one(users, {
    fields: [issues.assignedToId],
    references: [users.id],
    relationName: "assignedTo",
  }),
  department: one(departments, {
    fields: [issues.departmentId],
    references: [departments.id],
  }),
  images: many(issueImages),
  comments: many(issueComments),
  upvotes: many(issueUpvotes),
}));

export const issueImagesRelations = relations(issueImages, ({ one }) => ({
  issue: one(issues, {
    fields: [issueImages.issueId],
    references: [issues.id],
  }),
  uploadedBy: one(users, {
    fields: [issueImages.uploadedById],
    references: [users.id],
  }),
}));

export const issueCommentsRelations = relations(issueComments, ({ one }) => ({
  issue: one(issues, {
    fields: [issueComments.issueId],
    references: [issues.id],
  }),
  user: one(users, {
    fields: [issueComments.userId],
    references: [users.id],
  }),
}));

export const issueUpvotesRelations = relations(issueUpvotes, ({ one }) => ({
  issue: one(issues, {
    fields: [issueUpvotes.issueId],
    references: [issues.id],
  }),
  user: one(users, {
    fields: [issueUpvotes.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
  departmentId: true,
  phoneNumber: true,
});

export const insertIssueSchema = createInsertSchema(issues).pick({
  title: true,
  description: true,
  category: true,
  location: true,
  latitude: true,
  longitude: true,
  reportedById: true,
}).extend({
  images: z.array(z.object({
    fileName: z.string(),
    filePath: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
  })).optional(),
});

export const insertCommentSchema = createInsertSchema(issueComments).pick({
  issueId: true,
  comment: true,
  isInternal: true,
});

export const updateIssueStatusSchema = z.object({
  status: z.enum(['new', 'in_progress', 'resolved', 'closed', 'duplicate']),
  assignedToId: z.string().optional(),
  departmentId: z.string().optional(),
  comment: z.string().optional(),
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type IssueImage = typeof issueImages.$inferSelect;
export type IssueComment = typeof issueComments.$inferSelect;
export type IssueUpvote = typeof issueUpvotes.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type UpdateIssueStatus = z.infer<typeof updateIssueStatusSchema>;

// Extended types with relations
export type IssueWithDetails = Issue & {
  reportedBy: User;
  assignedTo?: User;
  department?: Department;
  images: IssueImage[];
  comments: IssueComment[];
  upvotes: number; // Changed from IssueUpvote[] to number for count
  _count?: {
    upvotes: number;
    comments: number;
  };
};

export type UserWithDepartment = User & {
  department?: Department;
};
