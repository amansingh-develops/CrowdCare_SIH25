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

export class MongoDBStorage implements IStorage {
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
    const { db } = await connectToDatabase();
    const now = new Date();
    
    const issue = {
      ...issueData,
      status: 'new' as const,
      priority: 'medium' as const,
      upvotes: 0,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('issues').insertOne(issue);
    
    // Add images if provided
    if (issueData.images && issueData.images.length > 0) {
      const images = issueData.images.map(img => ({
        issueId: result.insertedId.toString(),
        ...img,
        uploadedById: issueData.reportedById,
        createdAt: now,
      }));
      
      await db.collection('issueImages').insertMany(images);
    }

    return { ...issue, _id: result.insertedId.toString() } as Issue;
  }

  async getIssue(id: string): Promise<IssueWithDetails | undefined> {
    const { db } = await connectToDatabase();
    
    const pipeline = [
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: 'users',
          localField: 'reportedById',
          foreignField: '_id',
          as: 'reportedBy'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedToId',
          foreignField: '_id',
          as: 'assignedTo'
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: 'departmentId',
          foreignField: '_id',
          as: 'department'
        }
      },
      {
        $lookup: {
          from: 'issueImages',
          localField: '_id',
          foreignField: 'issueId',
          as: 'images'
        }
      },
      {
        $lookup: {
          from: 'issueComments',
          localField: '_id',
          foreignField: 'issueId',
          as: 'comments'
        }
      },
      {
        $lookup: {
          from: 'issueUpvotes',
          localField: '_id',
          foreignField: 'issueId',
          as: 'upvotes'
        }
      },
      {
        $addFields: {
          reportedBy: { $arrayElemAt: ['$reportedBy', 0] },
          assignedTo: { $arrayElemAt: ['$assignedTo', 0] },
          department: { $arrayElemAt: ['$department', 0] },
          upvotes: { $size: '$upvotes' },
          _count: {
            upvotes: { $size: '$upvotes' },
            comments: { $size: '$comments' }
          }
        }
      }
    ];
    
    const result = await db.collection('issues').aggregate(pipeline).toArray();
    return result[0] as IssueWithDetails | undefined;
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
    const { db } = await connectToDatabase();
    
    // Build match conditions
    const matchConditions: any = {};
    if (params.status) matchConditions.status = params.status;
    if (params.category) matchConditions.category = params.category;
    if (params.departmentId) matchConditions.departmentId = new ObjectId(params.departmentId);
    if (params.reportedById) matchConditions.reportedById = new ObjectId(params.reportedById);
    if (params.assignedToId) matchConditions.assignedToId = new ObjectId(params.assignedToId);

    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'users',
          localField: 'reportedById',
          foreignField: '_id',
          as: 'reportedBy'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedToId',
          foreignField: '_id',
          as: 'assignedTo'
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: 'departmentId',
          foreignField: '_id',
          as: 'department'
        }
      },
      {
        $lookup: {
          from: 'issueImages',
          localField: '_id',
          foreignField: 'issueId',
          as: 'images'
        }
      },
      {
        $lookup: {
          from: 'issueUpvotes',
          localField: '_id',
          foreignField: 'issueId',
          as: 'upvotes'
        }
      },
      {
        $addFields: {
          reportedBy: { $arrayElemAt: ['$reportedBy', 0] },
          assignedTo: { $arrayElemAt: ['$assignedTo', 0] },
          department: { $arrayElemAt: ['$department', 0] },
          upvotes: { $size: '$upvotes' },
          _count: {
            upvotes: { $size: '$upvotes' },
            comments: { $size: '$comments' }
          }
        }
      },
      {
        $sort: {
          // Priority sorting: urgent > high > medium > low
          priority: {
            $switch: {
              branches: [
                { case: { $eq: ['$priority', 'urgent'] }, then: 4 },
                { case: { $eq: ['$priority', 'high'] }, then: 3 },
                { case: { $eq: ['$priority', 'medium'] }, then: 2 },
                { case: { $eq: ['$priority', 'low'] }, then: 1 }
              ],
              default: 0
            }
          },
          upvotes: -1,
          createdAt: -1
        }
      }
    ];

    if (params.offset) {
      pipeline.push({ $skip: params.offset });
    }
    if (params.limit) {
      pipeline.push({ $limit: params.limit });
    }

    const results = await db.collection('issues').aggregate(pipeline).toArray();
    return results as IssueWithDetails[];
  }

  async updateIssueStatus(id: string, update: UpdateIssueStatus): Promise<Issue> {
    const { db } = await connectToDatabase();
    const now = new Date();
    
    const updateData: any = {
      status: update.status,
      updatedAt: now,
    };

    if (update.assignedToId) updateData.assignedToId = new ObjectId(update.assignedToId);
    if (update.departmentId) updateData.departmentId = new ObjectId(update.departmentId);
    if (update.status === 'resolved') updateData.resolvedAt = now;

    const result = await db.collection('issues').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    // Add comment if provided
    if (update.comment && result) {
      await db.collection('issueComments').insertOne({
        issueId: id,
        userId: update.assignedToId || result.reportedById,
        comment: update.comment,
        isInternal: true,
        createdAt: now,
      });
    }

    return result as Issue;
  }

  // Issue interaction operations
  async addComment(comment: InsertComment & { userId: string }): Promise<IssueComment> {
    const { db } = await connectToDatabase();
    const now = new Date();
    
    const newComment = {
      ...comment,
      userId: new ObjectId(comment.userId),
      issueId: new ObjectId(comment.issueId),
      createdAt: now,
    };

    const result = await db.collection('issueComments').insertOne(newComment);
    return { ...newComment, _id: result.insertedId.toString() } as IssueComment;
  }

  async toggleUpvote(issueId: string, userId: string): Promise<{ upvoted: boolean; count: number }> {
    const { db } = await connectToDatabase();
    
    // Check if upvote exists
    const existingUpvote = await db.collection('issueUpvotes').findOne({
      issueId: new ObjectId(issueId),
      userId: new ObjectId(userId)
    });

    if (existingUpvote) {
      // Remove upvote
      await db.collection('issueUpvotes').deleteOne({ _id: existingUpvote._id });
      
      // Decrement issue upvotes
      await db.collection('issues').updateOne(
        { _id: new ObjectId(issueId) },
        { $inc: { upvotes: -1 } }
      );

      const newCount = await this.getUpvoteCount(issueId);
      return { upvoted: false, count: newCount };
    } else {
      // Add upvote
      await db.collection('issueUpvotes').insertOne({
        issueId: new ObjectId(issueId),
        userId: new ObjectId(userId),
        createdAt: new Date(),
      });

      // Increment issue upvotes
      await db.collection('issues').updateOne(
        { _id: new ObjectId(issueId) },
        { $inc: { upvotes: 1 } }
      );

      const newCount = await this.getUpvoteCount(issueId);
      return { upvoted: true, count: newCount };
    }
  }

  private async getUpvoteCount(issueId: string): Promise<number> {
    const { db } = await connectToDatabase();
    const count = await db.collection('issueUpvotes').countDocuments({
      issueId: new ObjectId(issueId)
    });
    return count;
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
    const { db } = await connectToDatabase();
    const now = new Date();
    
    const image = {
      ...imageData,
      issueId: new ObjectId(imageData.issueId),
      uploadedById: new ObjectId(imageData.uploadedById),
      createdAt: now,
    };

    const result = await db.collection('issueImages').insertOne(image);
    return { ...image, _id: result.insertedId.toString() } as IssueImage;
  }

  // Analytics operations
  async getIssueStats(departmentId?: string): Promise<{
    total: number;
    new: number;
    inProgress: number;
    resolved: number;
    avgResolutionTime: number;
  }> {
    const { db } = await connectToDatabase();
    
    const matchConditions: any = {};
    if (departmentId) matchConditions.departmentId = new ObjectId(departmentId);

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          resolvedIssues: {
            $push: {
              $cond: [
                { $and: [{ $eq: ['$status', 'resolved'] }, { $ne: ['$resolvedAt', null] }] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                null
              ]
            }
          }
        }
      },
      {
        $addFields: {
          avgResolutionTime: {
            $avg: {
              $filter: {
                input: '$resolvedIssues',
                cond: { $ne: ['$$this', null] }
              }
            }
          }
        }
      }
    ];

    const result = await db.collection('issues').aggregate(pipeline).toArray();
    const stats = result[0] || { total: 0, new: 0, inProgress: 0, resolved: 0, avgResolutionTime: 0 };
    
    return {
      total: stats.total,
      new: stats.new,
      inProgress: stats.inProgress,
      resolved: stats.resolved,
      avgResolutionTime: Math.round(stats.avgResolutionTime / (1000 * 60 * 60 * 24)) || 0, // Convert to days
    };
  }

  // Location-based operations
  async getNearbyIssues(lat: number, lng: number, radiusKm: number): Promise<IssueWithDetails[]> {
    const { db } = await connectToDatabase();
    
    // Simple bounding box query (for production, use MongoDB's geospatial features)
    const latRange = radiusKm / 111.0; // rough conversion
    const lngRange = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180));

    const pipeline = [
      {
        $match: {
          latitude: { $gte: lat - latRange, $lte: lat + latRange },
          longitude: { $gte: lng - lngRange, $lte: lng + lngRange }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'reportedById',
          foreignField: '_id',
          as: 'reportedBy'
        }
      },
      {
        $addFields: {
          reportedBy: { $arrayElemAt: ['$reportedBy', 0] },
          images: [],
          comments: [],
          upvotes: 0
        }
      },
      { $sort: { createdAt: -1 } }
    ];

    const results = await db.collection('issues').aggregate(pipeline).toArray();
    return results as IssueWithDetails[];
  }
}

export const storage = new MongoDBStorage();
