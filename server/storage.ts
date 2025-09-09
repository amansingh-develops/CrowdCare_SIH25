import {
  type User,
  type UpsertUser,
  type Department,
  type Issue,
  type IssueWithDetails,
  type IssueImage,
  type IssueComment,
  type InsertIssue,
  type InsertComment,
  type UpdateIssueStatus,
  type UserWithDepartment,
} from "@shared/mongodb-schema";
import { connectToDatabase } from "./db";
import { ObjectId } from "mongodb";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserWithDepartment(id: string): Promise<UserWithDepartment | undefined>;
  
  // Department operations
  getDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  
  // Issue operations
  createIssue(issue: InsertIssue): Promise<Issue>;
  getIssue(id: string): Promise<IssueWithDetails | undefined>;
  getIssues(params?: {
    status?: string;
    category?: string;
    departmentId?: string;
    reportedById?: string;
    assignedToId?: string;
    limit?: number;
    offset?: number;
  }): Promise<IssueWithDetails[]>;
  updateIssueStatus(id: string, update: UpdateIssueStatus): Promise<Issue>;
  
  // Issue interaction operations
  addComment(comment: InsertComment): Promise<IssueComment>;
  toggleUpvote(issueId: string, userId: string): Promise<{ upvoted: boolean; count: number }>;
  
  // Image operations
  addIssueImage(image: {
    issueId: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    isEvidence?: boolean;
    uploadedById: string;
  }): Promise<IssueImage>;
  
  // Analytics operations
  getIssueStats(departmentId?: string): Promise<{
    total: number;
    new: number;
    inProgress: number;
    resolved: number;
    avgResolutionTime: number;
  }>;
  
  // Location-based operations
  getNearbyIssues(lat: number, lng: number, radiusKm: number): Promise<IssueWithDetails[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    return user as User | undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const { db } = await connectToDatabase();
    const now = new Date();
    
    const result = await db.collection('users').findOneAndUpdate(
      { _id: userData._id ? new ObjectId(userData._id) : undefined },
      {
        $set: {
          ...userData,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
          contributionScore: 0,
          isActive: true,
        }
      },
      { 
        upsert: true, 
        returnDocument: 'after' 
      }
    );
    
    return result as User;
  }

  async getUserWithDepartment(id: string): Promise<UserWithDepartment | undefined> {
    const { db } = await connectToDatabase();
    
    const pipeline = [
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: 'departments',
          localField: 'departmentId',
          foreignField: '_id',
          as: 'department'
        }
      },
      {
        $addFields: {
          department: { $arrayElemAt: ['$department', 0] }
        }
      }
    ];
    
    const result = await db.collection('users').aggregate(pipeline).toArray();
    return result[0] as UserWithDepartment | undefined;
  }

  // Department operations
  async getDepartments(): Promise<Department[]> {
    const { db } = await connectToDatabase();
    const departments = await db.collection('departments').find({ isActive: true }).toArray();
    return departments as Department[];
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const { db } = await connectToDatabase();
    const department = await db.collection('departments').findOne({ _id: new ObjectId(id) });
    return department as Department | undefined;
  }

  // Issue operations
  async createIssue(issueData: InsertIssue): Promise<Issue> {
    const [issue] = await db
      .insert(issues)
      .values({
        ...issueData,
        latitude: issueData.latitude?.toString(),
        longitude: issueData.longitude?.toString(),
      })
      .returning();

    // Add images if provided
    if (issueData.images && issueData.images.length > 0) {
      await db.insert(issueImages).values(
        issueData.images.map(img => ({
          issueId: issue.id,
          ...img,
          uploadedById: issueData.reportedById,
        }))
      );
    }

    return issue;
  }

  async getIssue(id: string): Promise<IssueWithDetails | undefined> {
    const [result] = await db
      .select({
        issue: issues,
        reportedBy: users,
      })
      .from(issues)
      .innerJoin(users, eq(issues.reportedById, users.id))
      .where(eq(issues.id, id));

    if (!result) return undefined;

    // Get additional data
    const [assignedTo] = result.issue.assignedToId 
      ? await db.select().from(users).where(eq(users.id, result.issue.assignedToId))
      : [undefined];

    const [department] = result.issue.departmentId
      ? await db.select().from(departments).where(eq(departments.id, result.issue.departmentId))
      : [undefined];

    const images = await db.select().from(issueImages).where(eq(issueImages.issueId, id));
    const comments = await db.select().from(issueComments).where(eq(issueComments.issueId, id));
    const upvotes = await db.select().from(issueUpvotes).where(eq(issueUpvotes.issueId, id));

    return {
      ...result.issue,
      reportedBy: result.reportedBy,
      assignedTo,
      department,
      images,
      comments,
      upvotes: upvotes.length,
    };
  }

  async getIssues(params: {
    status?: string;
    category?: string;
    departmentId?: string;
    reportedById?: string;
    assignedToId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<IssueWithDetails[]> {
    // Build conditions
    const conditions = [];
    if (params.status) conditions.push(eq(issues.status, params.status as any));
    if (params.category) conditions.push(eq(issues.category, params.category as any));
    if (params.departmentId) conditions.push(eq(issues.departmentId, params.departmentId));
    if (params.reportedById) conditions.push(eq(issues.reportedById, params.reportedById));
    if (params.assignedToId) conditions.push(eq(issues.assignedToId, params.assignedToId));

    // Build and execute query
    let queryBuilder = db
      .select({
        issue: issues,
        reportedBy: users,
      })
      .from(issues)
      .innerJoin(users, eq(issues.reportedById, users.id))
      .$dynamic();

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    // Order by priority first (urgent > high > medium > low), then by upvotes, then by creation date
    queryBuilder = queryBuilder.orderBy(
      sql`CASE 
        WHEN ${issues.priority} = 'urgent' THEN 4
        WHEN ${issues.priority} = 'high' THEN 3
        WHEN ${issues.priority} = 'medium' THEN 2
        WHEN ${issues.priority} = 'low' THEN 1
        ELSE 0
      END DESC`,
      desc(issues.upvotes),
      desc(issues.createdAt)
    );
    
    if (params.limit) {
      queryBuilder = queryBuilder.limit(params.limit);
    }
    
    if (params.offset) {
      queryBuilder = queryBuilder.offset(params.offset);
    }

    const results = await queryBuilder;

    // Enhance with additional data
    const enhancedResults = await Promise.all(
      results.map(async (result) => {
        const [assignedTo] = result.issue.assignedToId 
          ? await db.select().from(users).where(eq(users.id, result.issue.assignedToId))
          : [undefined];

        const [department] = result.issue.departmentId
          ? await db.select().from(departments).where(eq(departments.id, result.issue.departmentId))
          : [undefined];

        const images = await db.select().from(issueImages).where(eq(issueImages.issueId, result.issue.id));
        const upvoteCount = await db
          .select({ count: count() })
          .from(issueUpvotes)
          .where(eq(issueUpvotes.issueId, result.issue.id));

        return {
          ...result.issue,
          reportedBy: result.reportedBy,
          assignedTo,
          department,
          images,
          comments: [],
          upvotes: upvoteCount[0]?.count || 0,
          _count: {
            upvotes: upvoteCount[0]?.count || 0,
            comments: 0,
          },
        };
      })
    );

    return enhancedResults;
  }

  async updateIssueStatus(id: string, update: UpdateIssueStatus): Promise<Issue> {
    const updateData: any = {
      status: update.status,
      updatedAt: new Date(),
    };

    if (update.assignedToId) updateData.assignedToId = update.assignedToId;
    if (update.departmentId) updateData.departmentId = update.departmentId;
    if (update.status === 'resolved') updateData.resolvedAt = new Date();

    const [issue] = await db
      .update(issues)
      .set(updateData)
      .where(eq(issues.id, id))
      .returning();

    // Add comment if provided
    if (update.comment && issue) {
      await db.insert(issueComments).values({
        issueId: id,
        userId: update.assignedToId || issue.reportedById,
        comment: update.comment,
        isInternal: true,
      });
    }

    return issue;
  }

  // Issue interaction operations
  async addComment(comment: InsertComment & { userId: string }): Promise<IssueComment> {
    const [newComment] = await db
      .insert(issueComments)
      .values(comment)
      .returning();
    return newComment;
  }

  async toggleUpvote(issueId: string, userId: string): Promise<{ upvoted: boolean; count: number }> {
    // Check if upvote exists
    const [existingUpvote] = await db
      .select()
      .from(issueUpvotes)
      .where(and(eq(issueUpvotes.issueId, issueId), eq(issueUpvotes.userId, userId)));

    if (existingUpvote) {
      // Remove upvote
      await db
        .delete(issueUpvotes)
        .where(eq(issueUpvotes.id, existingUpvote.id));
      
      // Decrement issue upvotes
      await db
        .update(issues)
        .set({ upvotes: sql`${issues.upvotes} - 1` })
        .where(eq(issues.id, issueId));

      const newCount = await this.getUpvoteCount(issueId);
      return { upvoted: false, count: newCount };
    } else {
      // Add upvote
      await db.insert(issueUpvotes).values({
        issueId,
        userId,
      });

      // Increment issue upvotes
      await db
        .update(issues)
        .set({ upvotes: sql`${issues.upvotes} + 1` })
        .where(eq(issues.id, issueId));

      const newCount = await this.getUpvoteCount(issueId);
      return { upvoted: true, count: newCount };
    }
  }

  private async getUpvoteCount(issueId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(issueUpvotes)
      .where(eq(issueUpvotes.issueId, issueId));
    return result?.count || 0;
  }

  // Image operations
  async addIssueImage(imageData: {
    issueId: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    isEvidence?: boolean;
    uploadedById: string;
  }): Promise<IssueImage> {
    const [image] = await db
      .insert(issueImages)
      .values(imageData)
      .returning();
    return image;
  }

  // Analytics operations
  async getIssueStats(departmentId?: string): Promise<{
    total: number;
    new: number;
    inProgress: number;
    resolved: number;
    avgResolutionTime: number;
  }> {
    const conditions = departmentId ? [eq(issues.departmentId, departmentId)] : [];
    const allIssues = conditions.length > 0 
      ? await db.select().from(issues).where(and(...conditions))
      : await db.select().from(issues);


    const stats = {
      total: allIssues.length,
      new: allIssues.filter(i => i.status === 'new').length,
      inProgress: allIssues.filter(i => i.status === 'in_progress').length,
      resolved: allIssues.filter(i => i.status === 'resolved').length,
      avgResolutionTime: 0,
    };

    // Calculate average resolution time
    const resolvedIssues = allIssues.filter(i => i.status === 'resolved' && i.resolvedAt);
    if (resolvedIssues.length > 0) {
      const totalTime = resolvedIssues.reduce((sum, issue) => {
        const created = new Date(issue.createdAt!).getTime();
        const resolved = new Date(issue.resolvedAt!).getTime();
        return sum + (resolved - created);
      }, 0);
      stats.avgResolutionTime = Math.round(totalTime / resolvedIssues.length / (1000 * 60 * 60 * 24)); // days
    }

    return stats;
  }

  // Location-based operations
  async getNearbyIssues(lat: number, lng: number, radiusKm: number): Promise<IssueWithDetails[]> {
    // Simple bounding box query (for production, use PostGIS functions)
    const latRange = radiusKm / 111.0; // rough conversion
    const lngRange = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180));

    const nearbyIssues = await db
      .select({
        issue: issues,
        reportedBy: users,
      })
      .from(issues)
      .innerJoin(users, eq(issues.reportedById, users.id))
      .where(
        and(
          sql`${issues.latitude} >= ${lat - latRange}`,
          sql`${issues.latitude} <= ${lat + latRange}`,
          sql`${issues.longitude} >= ${lng - lngRange}`,
          sql`${issues.longitude} <= ${lng + lngRange}`
        )
      )
      .orderBy(desc(issues.createdAt));

    // Enhance with additional data (simplified for nearby issues)
    return nearbyIssues.map(result => ({
      ...result.issue,
      reportedBy: result.reportedBy,
      images: [],
      comments: [],
      upvotes: 0,
    }));
  }
}

export const storage = new DatabaseStorage();
