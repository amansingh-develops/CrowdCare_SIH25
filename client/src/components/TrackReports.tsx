import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Search,
  Eye,
  MessageSquare,
  Star,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';

interface Report {
  id: number;
  title: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  urgency_score: number;
  urgency_label: 'Low' | 'Medium' | 'High' | 'Critical';
  created_at: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed' | 'deleted';
  reporter_id: string;
  reporter_name?: string;
  image_url?: string;
  ai_generated_title?: string;
  ai_generated_description?: string;
  ai_tags?: string;
  mcq_responses?: string;
  admin_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution_image_url?: string;
  resolution_coordinates?: string;
  is_deleted?: boolean;
  deletion_reason?: string;
  deleted_at?: string;
  citizen_replies?: CitizenReply[];
  rating?: number;
  rating_feedback?: string;
  // Resolution details
  resolution_details?: {
    report_id: number;
    resolved_by: string;
    resolved_at: string;
    resolution_image_url: string;
    resolution_coordinates: any;
    admin_notes: string;
    admin_verification_image_url?: string;
    admin_id: string;
    admin_name?: string;
    original_coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

interface CitizenReply {
  id: number;
  report_id: number;
  message: string;
  created_at: string;
  is_admin_reply: boolean;
  admin_name?: string;
}

const urgencyColors = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100 text-red-800'
};

const statusColors = {
  pending: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  deleted: 'bg-red-100 text-red-800'
};

const deleteReasons = [
  'Issue was resolved by myself',
  'Issue was a false alarm',
  'Issue is no longer relevant',
  'I reported it by mistake',
  'Issue was already reported by someone else',
  'Other reason'
];

export default function TrackReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingResolution, setIsLoadingResolution] = useState(false);
  const [showRereportDialog, setShowRereportDialog] = useState(false);
  const [rereportReason, setRereportReason] = useState('');
  const [isSubmittingRereport, setIsSubmittingRereport] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration
  const mockReports: Report[] = [
    {
      id: 1,
      title: "Large Pothole on Main Street",
      category: "Pothole",
      description: "A critical severity pothole issue has been reported. The problem has been present for 2 weeks and affects traffic flow.",
      latitude: 22.7512,
      longitude: 75.8754,
      urgency_score: 87,
      urgency_label: "High",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      status: "resolved",
      reporter_name: "John Doe",
      image_url: "https://example.com/image1.jpg",
      admin_notes: "Pothole has been filled and road resurfaced. Work completed on 2025-01-20.",
      resolved_by: "Admin User",
      resolved_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      citizen_replies: [
        {
          id: 1,
          report_id: 1,
          message: "Thank you for the quick response! The pothole has been fixed perfectly.",
          created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
          is_admin_reply: false
        }
      ],
      rating: 5,
      rating_feedback: "Excellent service! Very satisfied with the resolution."
    },
    {
      id: 2,
      title: "Garbage Overflow in Market Area",
      category: "Garbage",
      description: "A high severity garbage issue has been reported. The problem has been present for 1 week and affects many people.",
      latitude: 22.7520,
      longitude: 75.8760,
      urgency_score: 92,
      urgency_label: "Critical",
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      status: "in_progress",
      reporter_name: "Jane Smith",
      image_url: "https://example.com/image2.jpg",
      admin_notes: "Garbage collection scheduled for tomorrow. Temporary cleanup in progress.",
      citizen_replies: [
        {
          id: 2,
          report_id: 2,
          message: "The garbage is still there. When will it be cleaned?",
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          is_admin_reply: false
        },
        {
          id: 3,
          report_id: 2,
          message: "We understand your concern. Our team is working on it and will complete the cleanup by tomorrow evening.",
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
          is_admin_reply: true,
          admin_name: "Admin User"
        }
      ]
    },
    {
      id: 3,
      title: "Broken Streetlight on Oak Avenue",
      category: "Streetlight",
      description: "A medium severity streetlight issue has been reported. The problem has been present for 1 day and affects pedestrians only.",
      latitude: 22.7505,
      longitude: 75.8748,
      urgency_score: 45,
      urgency_label: "Medium",
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      status: "pending",
      reporter_name: "Mike Johnson",
      image_url: "https://example.com/image3.jpg"
    },
    {
      id: 4,
      title: "Water Leak in Park",
      category: "Water",
      description: "There's a water leak in the central park that needs immediate attention.",
      latitude: 22.7530,
      longitude: 75.8770,
      urgency_score: 65,
      urgency_label: "High",
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      status: "pending",
      reporter_name: "Sarah Wilson",
      image_url: "https://example.com/image4.jpg"
    }
  ];

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const reportsData = await apiService.getMyReports();
      setReports(reportsData);
      setFilteredReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
      // Fallback to mock data if API fails
      setReports(mockReports);
      setFilteredReports(mockReports);
      toast({
        title: 'Warning',
        description: 'Using offline data. Some features may be limited.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = reports;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFilteredReports(filtered);
  }, [reports, searchTerm, statusFilter]);

  const handleViewReport = async (report: Report) => {
    setSelectedReport(report);
    setShowReportDialog(true);
    
    // Load resolution details if report is resolved
    if (report.status === 'resolved' && !report.resolution_details) {
      await loadResolutionDetails(report.id);
    }
  };

  const loadResolutionDetails = async (reportId: number) => {
    setIsLoadingResolution(true);
    try {
      const resolutionDetails = await apiService.getPublicResolution(reportId);
      
      // Update the report with resolution details
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, resolution_details: resolutionDetails }
          : report
      ));
      
      setSelectedReport(prev => prev && prev.id === reportId 
        ? { ...prev, resolution_details: resolutionDetails }
        : prev
      );
    } catch (error) {
      console.error('Error loading resolution details:', error);
      toast({
        title: 'Warning',
        description: 'Could not load resolution details.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingResolution(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!newReply.trim() || !selectedReport) return;

    setIsSubmittingReply(true);
    try {
      const replyData = await apiService.createReply({
        report_id: selectedReport.id,
        message: newReply,
        is_admin_reply: false
      });
      
      const newReplyObj: CitizenReply = {
        id: replyData.id,
        report_id: selectedReport.id,
        message: newReply,
        created_at: replyData.created_at,
        is_admin_reply: false
      };

      // Update the report with new reply
      setReports(prev => prev.map(report => 
        report.id === selectedReport.id 
          ? { 
              ...report, 
              citizen_replies: [...(report.citizen_replies || []), newReplyObj] 
            }
          : report
      ));

      setSelectedReport(prev => prev ? {
        ...prev,
        citizen_replies: [...(prev.citizen_replies || []), newReplyObj]
      } : null);

      setNewReply('');
      toast({
        title: 'Reply Sent',
        description: 'Your reply has been sent successfully.',
      });
    } catch (error) {
      console.error('Error submitting reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reply. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleRateExperience = async () => {
    if (!selectedReport || rating === 0) return;

    setIsSubmittingRating(true);
    try {
      const ratingData = await apiService.rateReport({
        report_id: selectedReport.id,
        rating,
        feedback: ratingFeedback
      });
      
      // Update the report with rating
      setReports(prev => prev.map(report => 
        report.id === selectedReport.id 
          ? { 
              ...report, 
              rating,
              rating_feedback: ratingFeedback
            }
          : report
      ));

      setSelectedReport(prev => prev ? {
        ...prev,
        rating,
        rating_feedback: ratingFeedback
      } : null);

      setShowRatingDialog(false);
      setRating(0);
      setRatingFeedback('');
      toast({
        title: 'Rating Submitted',
        description: 'Thank you for your feedback!',
      });
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit rating. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!selectedReport || !deleteReason) return;

    setIsDeleting(true);
    try {
      await apiService.deleteReport(selectedReport.id, deleteReason);
      
      // Remove the report from the list
      setReports(prev => prev.filter(report => report.id !== selectedReport.id));
      setFilteredReports(prev => prev.filter(report => report.id !== selectedReport.id));

      setShowDeleteDialog(false);
      setShowReportDialog(false);
      setDeleteReason('');
      toast({
        title: 'Report Deleted',
        description: 'Your report has been deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRereportIssue = async () => {
    if (!selectedReport || !rereportReason.trim()) return;

    setIsSubmittingRereport(true);
    try {
      // Create a new report with the same details but different reason
      const formData = new FormData();
      formData.append('title', `${selectedReport.title} (Re-reported)`);
      formData.append('description', `Re-reported issue: ${rereportReason}\n\nOriginal description: ${selectedReport.description}`);
      formData.append('category', selectedReport.category);
      formData.append('latitude', selectedReport.latitude.toString());
      formData.append('longitude', selectedReport.longitude.toString());
      
      // Add the original image if available
      if (selectedReport.image_url) {
        // For now, we'll just reference the original image URL
        formData.append('image_url', selectedReport.image_url);
      }

      const newReport = await apiService.createReport(formData);
      
      setShowRereportDialog(false);
      setShowReportDialog(false);
      setRereportReason('');
      
      // Reload reports to show the new one
      await loadReports();
      
      toast({
        title: 'Issue Re-reported',
        description: 'Your issue has been re-reported successfully.',
      });
    } catch (error) {
      console.error('Error re-reporting issue:', error);
      toast({
        title: 'Error',
        description: 'Failed to re-report issue. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingRereport(false);
    }
  };

  const parseAsUtc = (input: string) => {
    if (!input) return null as any;
    // Normalize: ensure 'T' separator, and ensure timezone exists (default to Z)
    let s = input.trim();
    if (!s.includes('T') && s.includes(' ')) s = s.replace(' ', 'T');
    // If already has timezone (+/- or Z), keep; else append Z (UTC)
    const hasTz = /([+-]\d{2}:?\d{2}|Z)$/i.test(s);
    const normalized = hasTz ? s : `${s}Z`;
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  };

  const getTimePassed = (createdAt: string) => {
    const now = new Date();
    const created = parseAsUtc(createdAt) || new Date(createdAt);
    if (isNaN(created.getTime())) return 'Just now';
    const diffInMs = now.getTime() - created.getTime();
    
    // Handle negative time differences (future dates)
    if (diffInMs < 0) {
      return 'Just now';
    }
    
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInYears > 0) {
      return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
    } else if (diffInMonths > 0) {
      return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    } else if (diffInWeeks > 0) {
      return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    } else if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds > 0) {
      return `${diffInSeconds} second${diffInSeconds > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const formatDate = (dateString: string) => {
    const date = parseAsUtc(dateString) || new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Track Your Reports</h2>
          <p className="text-gray-600">Monitor the status of your submitted reports and communicate with administrators.</p>
        </div>
        <Button onClick={loadReports} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No reports match your current filters.' 
                  : 'You haven\'t submitted any reports yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                      <Badge className={urgencyColors[report.urgency_label]}>
                        {report.urgency_label}
                      </Badge>
                      <Badge className={statusColors[report.status]}>
                        {report.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>Submitted {getTimePassed(report.created_at)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          {report.category}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          {report.citizen_replies?.length || 0} replies
                        </div>
                        {report.rating && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Star className="w-4 h-4 mr-2 text-yellow-500" />
                            Rated {report.rating}/5 stars
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                      {report.description}
                    </p>

                    {report.admin_notes && (
                      <div className="bg-blue-50 p-3 rounded-lg mb-4">
                        <div className="flex items-center mb-1">
                          <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-blue-800">Admin Update</span>
                        </div>
                        <p className="text-sm text-blue-700">{report.admin_notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewReport(report)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    
                    {report.status === 'resolved' && !report.rating && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setSelectedReport(report);
                          setShowRatingDialog(true);
                        }}
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Rate Experience
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Report Details Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                Report Details
              </DialogTitle>
              <Button variant="outline" size="sm" onClick={loadReports}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </DialogHeader>
          
          {selectedReport && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {/* Report Info */}
              <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Urgency</h4>
                  <div className="flex items-center space-x-2">
                    <Badge className={urgencyColors[selectedReport.urgency_label]}>
                      {selectedReport.urgency_label}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Score: {selectedReport.urgency_score}/100
                    </span>
                  </div>
                  <Progress value={selectedReport.urgency_score} className="mt-2" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                  <Badge className={statusColors[selectedReport.status]}>
                    {selectedReport.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Category</h4>
                  <Badge variant="outline">{selectedReport.category}</Badge>
                </div>
              </div>

              {/* Report Content */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-700">{selectedReport.description}</p>
                </div>

                {selectedReport.image_url && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Photo Evidence</h4>
                    <div className="border rounded-lg p-2 bg-gray-50">
                      <img 
                        src={selectedReport.image_url.startsWith('http') ? selectedReport.image_url : `http://localhost:8000${selectedReport.image_url}`}
                        alt="Report evidence"
                        className="max-w-full h-auto rounded-lg shadow-sm max-h-64 object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const errorDiv = target.nextElementSibling as HTMLElement;
                          if (errorDiv) {
                            errorDiv.style.display = 'block';
                          }
                        }}
                      />
                      <div className="hidden text-sm text-gray-500 text-center py-4">
                        <div className="flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 mr-2 text-gray-400" />
                          Image could not be loaded
                        </div>
                        <p className="text-xs mt-1">URL: {selectedReport.image_url}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedReport.admin_notes && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Admin Notes</h4>
                    <p className="text-blue-800">{selectedReport.admin_notes}</p>
                    {selectedReport.resolved_by && (
                      <p className="text-sm text-blue-600 mt-2">
                        Resolved by: {selectedReport.resolved_by} on {formatDate(selectedReport.resolved_at || '')}
                      </p>
                    )}
                  </div>
                )}

                {/* Resolution Evidence Section */}
                {selectedReport.status === 'resolved' && (
                  <div className="space-y-4">
                    {isLoadingResolution ? (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span className="text-green-800">Loading resolution details...</span>
                        </div>
                      </div>
                    ) : selectedReport.resolution_details ? (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-3 flex items-center">
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Resolution Evidence
                        </h4>
                        
                        {/* Admin Comment */}
                        {selectedReport.resolution_details.admin_notes && (
                          <div className="mb-4">
                            <h5 className="font-medium text-green-800 mb-2">Admin Comment:</h5>
                            <p className="text-green-700 bg-green-100 p-3 rounded-lg">
                              {selectedReport.resolution_details.admin_notes}
                            </p>
                          </div>
                        )}

                        {/* Resolution Photo */}
                        {selectedReport.resolution_details.resolution_image_url && (
                          <div className="mb-4">
                            <h5 className="font-medium text-green-800 mb-2">Resolution Photo:</h5>
                            <div className="border rounded-lg p-2 bg-white">
                              <img 
                                src={selectedReport.resolution_details.resolution_image_url.startsWith('http') 
                                  ? selectedReport.resolution_details.resolution_image_url 
                                  : `http://localhost:8000${selectedReport.resolution_details.resolution_image_url}`}
                                alt="Resolution evidence"
                                className="max-w-full h-auto rounded-lg shadow-sm max-h-64 object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const errorDiv = target.nextElementSibling as HTMLElement;
                                  if (errorDiv) {
                                    errorDiv.style.display = 'block';
                                  }
                                }}
                              />
                              <div className="hidden text-sm text-gray-500 text-center py-4">
                                <div className="flex items-center justify-center">
                                  <AlertTriangle className="w-5 h-5 mr-2 text-gray-400" />
                                  Resolution image could not be loaded
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Resolution Details */}
                        <div className="text-sm text-green-700">
                          <p><strong>Resolved by:</strong> {selectedReport.resolution_details.admin_name || 'Administrator'}</p>
                          <p><strong>Resolved on:</strong> {formatDate(selectedReport.resolution_details.resolved_at)}</p>
                          {selectedReport.resolution_details.resolution_coordinates && (
                            <p><strong>Distance from original location:</strong> {selectedReport.resolution_details.resolution_coordinates.distance_from_original_meters}m</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                          <span className="text-yellow-800">Resolution details not available</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Conversation Thread */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Conversation</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedReport.citizen_replies?.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-3 rounded-lg ${
                        reply.is_admin_reply 
                          ? 'bg-blue-50 ml-8' 
                          : 'bg-gray-50 mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {reply.is_admin_reply ? reply.admin_name || 'Administrator' : 'You'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(reply.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">{reply.message}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <div className="space-y-3">
                  <Textarea
                    placeholder="Type your reply here..."
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSubmitReply}
                      disabled={!newReply.trim() || isSubmittingReply}
                      size="sm"
                    >
                      {isSubmittingReply ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Send Reply
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Rating Section */}
              {selectedReport.status === 'resolved' && selectedReport.rating && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Your Rating</h4>
                  <div className="flex items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < selectedReport.rating! ? 'text-yellow-500 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-green-700">
                      {selectedReport.rating}/5 stars
                    </span>
                  </div>
                  {selectedReport.rating_feedback && (
                    <p className="text-sm text-green-800">{selectedReport.rating_feedback}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Report
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Report</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this report? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Please select a reason for deletion:
                        </label>
                        <Select value={deleteReason} onValueChange={setDeleteReason}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                          <SelectContent>
                            {deleteReasons.map((reason) => (
                              <SelectItem key={reason} value={reason}>
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteReport}
                        disabled={!deleteReason || isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete Report'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <div className="flex items-center gap-2">
                  {selectedReport && selectedReport.status === 'resolved' && !selectedReport.rating && (
                    <Button
                      size="sm"
                      onClick={() => setShowRatingDialog(true)}
                      className="bg-yellow-500 hover:bg-yellow-600"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Rate Experience
                    </Button>
                  )}
                  {selectedReport && selectedReport.status === 'resolved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRereportDialog(true)}
                      className="border-orange-500 text-orange-600 hover:bg-orange-50"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Re-report Issue
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="max-w-[92vw] sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-500" />
              Rate Your Experience
            </DialogTitle>
            <DialogDescription>
              How satisfied are you with the resolution of your report?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Rating (1-5 stars)
              </label>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setRating(i + 1)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        i < rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Additional Feedback (Optional)
              </label>
              <Textarea
                placeholder="Share your experience or suggestions..."
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRatingDialog(false)}
              className="flex-1"
              disabled={isSubmittingRating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRateExperience}
              disabled={rating === 0 || isSubmittingRating}
              className="flex-1"
            >
              {isSubmittingRating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  Submit Rating
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Re-report Dialog */}
      <Dialog open={showRereportDialog} onOpenChange={setShowRereportDialog}>
        <DialogContent className="max-w-[92vw] sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <RefreshCw className="w-5 h-5 mr-2 text-orange-500" />
              Re-report Issue
            </DialogTitle>
            <DialogDescription>
              Why are you re-reporting this issue? Please provide details about why the resolution was not satisfactory.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Reason for Re-reporting
              </label>
              <Textarea
                placeholder="Please explain why you need to re-report this issue..."
                value={rereportReason}
                onChange={(e) => setRereportReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRereportDialog(false)}
              className="flex-1"
              disabled={isSubmittingRereport}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRereportIssue}
              disabled={!rereportReason.trim() || isSubmittingRereport}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              {isSubmittingRereport ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Re-reporting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-report Issue
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
