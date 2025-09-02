import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const issueStatusEnum = pgEnum('issue_status', ['new', 'in_progress', 'resolved', 'closed', 'duplicate']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'urgent']);
export const userRoleEnum = pgEnum('user_role', ['citizen', 'admin', 'department_head', 'field_worker']);
export const categoryEnum = pgEnum('category', ['roads_transportation', 'public_safety', 'utilities', 'parks_recreation', 'sanitation', 'other']);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default('citizen'),
  departmentId: varchar("department_id"),
  phoneNumber: varchar("phone_number"),
  contributionScore: integer("contribution_score").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Departments
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Issues
export const issues = pgTable("issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  category: categoryEnum("category").notNull(),
  status: issueStatusEnum("status").default('new'),
  priority: priorityEnum("priority").default('medium'),
  location: text("location").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  reportedById: varchar("reported_by_id").notNull(),
  assignedToId: varchar("assigned_to_id"),
  departmentId: varchar("department_id"),
  aiSummary: text("ai_summary"),
  aiTags: text("ai_tags").array(),
  upvotes: integer("upvotes").default(0),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Issue Images
export const issueImages = pgTable("issue_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull(),
  fileName: varchar("file_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  isEvidence: boolean("is_evidence").default(false),
  uploadedById: varchar("uploaded_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Issue Comments/Updates
export const issueComments = pgTable("issue_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull(),
  userId: varchar("user_id").notNull(),
  comment: text("comment").notNull(),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Issue Upvotes
export const issueUpvotes = pgTable("issue_upvotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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
