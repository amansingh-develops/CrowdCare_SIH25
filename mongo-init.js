// MongoDB initialization script
db = db.getSiblingDB('crowdcare');

// Create collections
db.createCollection('users');
db.createCollection('issues');
db.createCollection('comments');
db.createCollection('departments');
db.createCollection('categories');
db.createCollection('gamification_profiles');
db.createCollection('badges');
db.createCollection('leaderboard');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "mobile_number": 1 }, { unique: true, sparse: true });
db.issues.createIndex({ "reportedById": 1 });
db.issues.createIndex({ "status": 1 });
db.issues.createIndex({ "priority": 1 });
db.issues.createIndex({ "category": 1 });
db.issues.createIndex({ "createdAt": -1 });
db.issues.createIndex({ "location": "2dsphere" });
db.comments.createIndex({ "issueId": 1 });
db.comments.createIndex({ "createdAt": -1 });

// Insert default categories
db.categories.insertMany([
  { name: "Pothole", description: "Road potholes and surface damage" },
  { name: "Garbage", description: "Waste management issues" },
  { name: "Streetlight", description: "Street lighting problems" },
  { name: "Water", description: "Water supply and drainage issues" },
  { name: "Electricity", description: "Power supply problems" },
  { name: "Traffic", description: "Traffic and road safety issues" },
  { name: "Parks", description: "Public parks and recreation" },
  { name: "Other", description: "Other municipal issues" }
]);

// Insert default departments
db.departments.insertMany([
  { name: "Public Works", description: "Roads, bridges, and infrastructure" },
  { name: "Sanitation", description: "Waste management and cleanliness" },
  { name: "Electricity", description: "Power supply and street lighting" },
  { name: "Water", description: "Water supply and drainage" },
  { name: "Traffic", description: "Traffic management and road safety" },
  { name: "Parks", description: "Public parks and recreation" },
  { name: "General", description: "General municipal services" }
]);

print('✅ MongoDB database initialized successfully!');
