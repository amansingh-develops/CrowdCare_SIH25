export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface UploadedImage {
  file: File;
  preview: string;
  fileName: string;
}

export interface IssueFormData {
  title?: string;
  description: string;
  category: string;
  location: string;
  latitude?: number;
  longitude?: number;
  images: UploadedImage[];
}

export interface AIAnalysisResult {
  title: string;
  summary: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  urgencyScore: number;
  estimatedResolutionTime: number;
}

export interface MapMarker {
  id: string;
  position: [number, number];
  title: string;
  status: string;
  priority: string;
  category: string;
}

export interface FilterOptions {
  status?: string;
  category?: string;
  priority?: string;
  department?: string;
}

export const ISSUE_CATEGORIES = [
  { value: 'roads_transportation', label: 'Roads & Transportation' },
  { value: 'public_safety', label: 'Public Safety' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'parks_recreation', label: 'Parks & Recreation' },
  { value: 'sanitation', label: 'Sanitation' },
  { value: 'other', label: 'Other' },
];

export const ISSUE_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
];

export const ISSUE_STATUSES = [
  { value: 'reported', label: 'Reported', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'acknowledged', label: 'Acknowledged', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-orange-100 text-orange-800' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-800' },
  { value: 'deleted', label: 'Deleted', color: 'bg-gray-100 text-gray-800' },
];

export interface StatusHistoryEntry {
  id: number;
  report_id: number;
  status: string;
  changed_by?: string;
  changed_at: string;
  notes?: string;
}

export interface StatusTimeline {
  report_id: number;
  current_status: string;
  stages: {
    reported: {
      status: 'completed' | 'pending';
      timestamp?: string;
      notes: string;
    };
    acknowledged: {
      status: 'completed' | 'pending';
      timestamp?: string;
      notes: string;
    };
    in_progress: {
      status: 'completed' | 'pending';
      timestamp?: string;
      notes: string;
    };
    resolved: {
      status: 'completed' | 'pending';
      timestamp?: string;
      notes: string;
    };
  };
  history: StatusHistoryEntry[];
}

export interface ResolutionResponse {
  success: boolean;
  message: string;
  report_id: number;
  status: string;
  resolved_at: string;
  evidence_url: string;
  admin_coordinates: {
    lat: number;
    lng: number;
  };
  distance_verified: boolean;
  distance_meters: number;
}
