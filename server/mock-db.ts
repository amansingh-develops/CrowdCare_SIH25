// Mock database for development when MongoDB is not available
import { Db } from 'mongodb';

// Mock data
const mockUsers = [
  {
    _id: 'user1',
    email: 'citizen@example.com',
    full_name: 'John Citizen',
    mobile_number: '+1234567890',
    role: 'citizen',
    is_active: true,
    is_verified: true,
    created_at: new Date().toISOString()
  },
  {
    _id: 'user2',
    email: 'admin@example.com',
    full_name: 'Admin User',
    mobile_number: '+1234567891',
    role: 'admin',
    admin_id: 'ADM001',
    municipality_name: 'Sample City',
    department_name: 'Public Works',
    is_active: true,
    is_verified: true,
    created_at: new Date().toISOString()
  }
];

const mockIssues = [
  {
    _id: 'issue1',
    title: 'Pothole on Main Street',
    description: 'Large pothole causing traffic issues',
    category: 'Pothole',
    status: 'open',
    priority: 'high',
    location: 'Main Street, Downtown',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    reportedById: 'user1',
    reportedBy: mockUsers[0],
    images: [
      {
        filePath: 'uploads/issue1_image1.jpg',
        originalName: 'pothole.jpg'
      }
    ],
    upvotes: 5,
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: 'issue2',
    title: 'Broken Streetlight',
    description: 'Streetlight not working on Oak Avenue',
    category: 'Streetlight',
    status: 'in_progress',
    priority: 'medium',
    location: 'Oak Avenue, Residential Area',
    coordinates: { lat: 40.7589, lng: -73.9851 },
    reportedById: 'user1',
    reportedBy: mockUsers[0],
    images: [],
    upvotes: 2,
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockDepartments = [
  { _id: 'dept1', name: 'Public Works', description: 'Roads and infrastructure' },
  { _id: 'dept2', name: 'Sanitation', description: 'Waste management' },
  { _id: 'dept3', name: 'Electricity', description: 'Power and lighting' }
];

const mockCategories = [
  { _id: 'cat1', name: 'Pothole', description: 'Road surface issues' },
  { _id: 'cat2', name: 'Garbage', description: 'Waste management' },
  { _id: 'cat3', name: 'Streetlight', description: 'Lighting problems' },
  { _id: 'cat4', name: 'Water', description: 'Water supply issues' }
];

// Mock database operations
export class MockDatabase {
  private users = [...mockUsers];
  private issues = [...mockIssues];
  private departments = [...mockDepartments];
  private categories = [...mockCategories];

  // User operations
  async findUserByEmail(email: string) {
    return this.users.find(user => user.email === email) || null;
  }

  async findUserById(id: string) {
    return this.users.find(user => user._id === id) || null;
  }

  async createUser(userData: any) {
    const newUser = {
      _id: `user${Date.now()}`,
      ...userData,
      is_active: true,
      is_verified: true,
      created_at: new Date().toISOString()
    };
    this.users.push(newUser);
    return newUser;
  }

  // Issue operations
  async findIssues(filter: any = {}) {
    let filteredIssues = [...this.issues];
    
    if (filter.reportedById) {
      filteredIssues = filteredIssues.filter(issue => issue.reportedById === filter.reportedById);
    }
    
    if (filter.status) {
      filteredIssues = filteredIssues.filter(issue => issue.status === filter.status);
    }
    
    if (filter.category) {
      filteredIssues = filteredIssues.filter(issue => issue.category === filter.category);
    }

    return filteredIssues;
  }

  async findIssueById(id: string) {
    return this.issues.find(issue => issue._id === id) || null;
  }

  async createIssue(issueData: any) {
    const newIssue = {
      _id: `issue${Date.now()}`,
      ...issueData,
      upvotes: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.issues.push(newIssue);
    return newIssue;
  }

  async updateIssue(id: string, updateData: any) {
    const index = this.issues.findIndex(issue => issue._id === id);
    if (index !== -1) {
      this.issues[index] = { ...this.issues[index], ...updateData, updatedAt: new Date().toISOString() };
      return this.issues[index];
    }
    return null;
  }

  // Department operations
  async findDepartments() {
    return this.departments;
  }

  // Category operations
  async findCategories() {
    return this.categories;
  }

  // Analytics
  async getIssueStats() {
    const total = this.issues.length;
    const open = this.issues.filter(issue => issue.status === 'open').length;
    const inProgress = this.issues.filter(issue => issue.status === 'in_progress').length;
    const resolved = this.issues.filter(issue => issue.status === 'resolved').length;

    return {
      total,
      open,
      in_progress: inProgress,
      resolved,
      categories: this.categories.map(cat => ({
        name: cat.name,
        count: this.issues.filter(issue => issue.category === cat.name).length
      }))
    };
  }
}

// Export singleton instance
export const mockDb = new MockDatabase();
