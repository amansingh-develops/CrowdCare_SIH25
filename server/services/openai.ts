import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface IssueAnalysis {
  title: string;
  summary: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  urgencyScore: number;
  estimatedResolutionTime: number;
}

export async function analyzeIssue(
  description: string,
  imageBase64?: string
): Promise<IssueAnalysis> {
  try {
    const messages: any[] = [
      {
        role: "system",
        content: `You are an AI assistant that analyzes civic issues for a municipal issue reporting system. 
        Analyze the provided issue description and optional image to categorize and prioritize the issue.
        
        Categories available:
        - roads_transportation: Potholes, traffic lights, road damage, signage
        - public_safety: Broken streetlights, dangerous conditions, security issues
        - utilities: Water leaks, power outages, gas issues, internet/telecom
        - parks_recreation: Park maintenance, playground issues, sports facilities
        - sanitation: Garbage collection, illegal dumping, cleanliness issues
        - other: Issues that don't fit other categories
        
        Priority levels:
        - low: Minor cosmetic issues, non-urgent maintenance
        - medium: Standard maintenance needs, moderate inconvenience
        - high: Safety concerns, significant impact on daily life
        - urgent: Immediate safety hazards, emergency situations
        
        Respond with JSON in this exact format:
        {
          "title": "Brief descriptive title (max 60 chars)",
          "summary": "Concise summary of the issue (max 200 chars)",
          "category": "one of the categories above",
          "priority": "one of: low, medium, high, urgent",
          "tags": ["relevant", "keywords", "for", "search"],
          "urgencyScore": 1-10,
          "estimatedResolutionTime": 1-30
        }`,
      },
    ];

    // Add description
    if (imageBase64) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Please analyze this civic issue: ${description}`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
            },
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `Please analyze this civic issue: ${description}`,
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages,
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    // Validate and sanitize the response
    return {
      title: result.title?.slice(0, 60) || "Civic Issue",
      summary: result.summary?.slice(0, 200) || description.slice(0, 200),
      category: validateCategory(result.category),
      priority: validatePriority(result.priority),
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 10) : [],
      urgencyScore: Math.max(1, Math.min(10, result.urgencyScore || 5)),
      estimatedResolutionTime: Math.max(1, Math.min(30, result.estimatedResolutionTime || 7)),
    };
  } catch (error) {
    console.error("Error analyzing issue with OpenAI:", error);
    
    // Fallback analysis
    return {
      title: description.slice(0, 60) || "Civic Issue",
      summary: description.slice(0, 200),
      category: "other",
      priority: "medium",
      tags: [],
      urgencyScore: 5,
      estimatedResolutionTime: 7,
    };
  }
}

export async function detectDuplicateIssues(
  description: string,
  location: string,
  existingIssues: Array<{ title: string; description: string; location: string }>
): Promise<{ isDuplicate: boolean; similarIssues: string[]; confidenceScore: number }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that detects duplicate civic issue reports. 
          Compare the new issue against existing issues to find potential duplicates.
          
          Consider issues as duplicates if they:
          - Describe the same physical problem
          - Are located in the same or very nearby area
          - Have similar symptoms or descriptions
          
          Respond with JSON in this format:
          {
            "isDuplicate": boolean,
            "similarIssues": ["id1", "id2"],
            "confidenceScore": 0.0-1.0
          }`,
        },
        {
          role: "user",
          content: `New issue:
          Description: ${description}
          Location: ${location}
          
          Existing issues to compare against:
          ${existingIssues.map((issue, idx) => 
            `${idx}: ${issue.title} - ${issue.description} (Location: ${issue.location})`
          ).join('\n')}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      isDuplicate: Boolean(result.isDuplicate),
      similarIssues: Array.isArray(result.similarIssues) ? result.similarIssues : [],
      confidenceScore: Math.max(0, Math.min(1, result.confidenceScore || 0)),
    };
  } catch (error) {
    console.error("Error detecting duplicates with OpenAI:", error);
    
    return {
      isDuplicate: false,
      similarIssues: [],
      confidenceScore: 0,
    };
  }
}

function validateCategory(category: string): string {
  const validCategories = [
    'roads_transportation',
    'public_safety', 
    'utilities',
    'parks_recreation',
    'sanitation',
    'other'
  ];
  return validCategories.includes(category) ? category : 'other';
}

function validatePriority(priority: string): 'low' | 'medium' | 'high' | 'urgent' {
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  return validPriorities.includes(priority) ? priority as any : 'medium';
}
