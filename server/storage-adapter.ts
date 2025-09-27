import { connectToDatabase } from "./db";
import { mockDb } from "./mock-db";
import { ObjectId } from "mongodb";

// Check if we're using mock database
function isMockDb(db: any): boolean {
  return db && typeof db.findUserByEmail === 'function';
}

export class StorageAdapter {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  // User operations
  async getUser(id: string) {
    if (isMockDb(this.db)) {
      return await this.db.findUserById(id);
    }
    return await this.db.collection('users').findOne({ _id: new ObjectId(id) });
  }

  async getUserByEmail(email: string) {
    if (isMockDb(this.db)) {
      return await this.db.findUserByEmail(email);
    }
    return await this.db.collection('users').findOne({ email });
  }

  async createUser(userData: any) {
    if (isMockDb(this.db)) {
      return await this.db.createUser(userData);
    }
    const result = await this.db.collection('users').insertOne({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { _id: result.insertedId, ...userData };
  }

  // Issue operations
  async getIssues(filter: any = {}) {
    if (isMockDb(this.db)) {
      return await this.db.findIssues(filter);
    }
    
    let query: any = {};
    if (filter.reportedById) query.reportedById = filter.reportedById;
    if (filter.status) query.status = filter.status;
    if (filter.category) query.category = filter.category;

    const issues = await this.db.collection('issues').find(query).toArray();
    
    // Populate user data for each issue
    for (const issue of issues) {
      if (issue.reportedById) {
        issue.reportedBy = await this.getUser(issue.reportedById);
      }
    }
    
    return issues;
  }

  async getIssue(id: string) {
    if (isMockDb(this.db)) {
      return await this.db.findIssueById(id);
    }
    
    const issue = await this.db.collection('issues').findOne({ _id: new ObjectId(id) });
    if (issue && issue.reportedById) {
      issue.reportedBy = await this.getUser(issue.reportedById);
    }
    return issue;
  }

  async createIssue(issueData: any) {
    if (isMockDb(this.db)) {
      return await this.db.createIssue(issueData);
    }
    
    const result = await this.db.collection('issues').insertOne({
      ...issueData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { _id: result.insertedId, ...issueData };
  }

  async updateIssue(id: string, updateData: any) {
    if (isMockDb(this.db)) {
      return await this.db.updateIssue(id, updateData);
    }
    
    const result = await this.db.collection('issues').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    return result;
  }

  // Department operations
  async getDepartments() {
    if (isMockDb(this.db)) {
      return await this.db.findDepartments();
    }
    return await this.db.collection('departments').find({}).toArray();
  }

  // Category operations
  async getCategories() {
    if (isMockDb(this.db)) {
      return await this.db.findCategories();
    }
    return await this.db.collection('categories').find({}).toArray();
  }

  // Analytics
  async getIssueStats() {
    if (isMockDb(this.db)) {
      return await this.db.getIssueStats();
    }
    
    const total = await this.db.collection('issues').countDocuments();
    const open = await this.db.collection('issues').countDocuments({ status: 'open' });
    const inProgress = await this.db.collection('issues').countDocuments({ status: 'in_progress' });
    const resolved = await this.db.collection('issues').countDocuments({ status: 'resolved' });

    return {
      total,
      open,
      in_progress: inProgress,
      resolved,
      categories: []
    };
  }
}

// Create and export storage instance
let storage: StorageAdapter;

export async function getStorage() {
  if (!storage) {
    const { db } = await connectToDatabase();
    storage = new StorageAdapter(db);
  }
  return storage;
}
