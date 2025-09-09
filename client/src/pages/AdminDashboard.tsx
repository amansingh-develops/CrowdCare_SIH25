import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  MapPin, 
  AlertTriangle, 
  Clock, 
  Users, 
  Filter,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  LogOut,
  TrendingUp,
  Calendar,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import PersonalDetailsSettings from '@/components/PersonalDetailsSettings';
import AdminReviewSection from '@/components/AdminReviewSection';
import { EvidenceUploadModal } from '@/components/EvidenceUploadModal';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

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
  status: 'reported' | 'acknowledged' | 'in_progress' | 'resolved' | 'deleted';
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
}

const urgencyColors = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100 text-red-800'
};

const statusColors: Record<string, string> = {
  reported: 'bg-yellow-100 text-yellow-800',
  acknowledged: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  deleted: 'bg-red-100 text-red-800'
};

export default function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'my-department' | 'other-departments' | 'reviews'>('my-department');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [reportToResolve, setReportToResolve] = useState<Report | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Mock data for demonstration
  const mockReports: Report[] = [
    {
      id: 1,
      title: "Large Pothole on Main Street",
      category: "Pothole",
      description: "A critical severity pothole issue has been reported. The problem has been present for 2 weeks and affects traffic flow. Immediate attention may be required to prevent further deterioration and ensure public safety.",
      latitude: 22.7512,
      longitude: 75.8754,
      urgency_score: 87,
      urgency_label: "High",
      created_at: "2025-09-03T10:15:00Z",
      status: "reported",
      reporter_id: "mock-user-1",
      reporter_name: "John Doe",
      image_url: "https://example.com/image1.jpg"
    },
    {
      id: 2,
      title: "Garbage Overflow in Market Area",
      category: "Garbage",
      description: "A high severity garbage issue has been reported. The problem has been present for 1 week and affects many people. Immediate attention may be required to prevent further deterioration and ensure public safety.",
      latitude: 22.7520,
      longitude: 75.8760,
      urgency_score: 92,
      urgency_label: "Critical",
      created_at: "2025-09-03T09:30:00Z",
      status: "in_progress",
      reporter_id: "mock-user-2",
      reporter_name: "Jane Smith",
      image_url: "https://example.com/image2.jpg"
    },
    {
      id: 3,
      title: "Broken Streetlight on Oak Avenue",
      category: "Streetlight",
      description: "A medium severity streetlight issue has been reported. The problem has been present for 1 day and affects pedestrians only. Immediate attention may be required to prevent further deterioration and ensure public safety.",
      latitude: 22.7505,
      longitude: 75.8748,
      urgency_score: 45,
      urgency_label: "Medium",
      created_at: "2025-09-03T08:45:00Z",
      status: "resolved",
      reporter_id: "mock-user-3",
      reporter_name: "Mike Johnson",
      image_url: "https://example.com/image3.jpg"
    },
    {
      id: 4,
      title: "Waterlogging Near School",
      category: "Waterlogging",
      description: "A low severity waterlogging issue has been reported. The problem has been present for just noticed and affects few people. Immediate attention may be required to prevent further deterioration and ensure public safety.",
      latitude: 22.7530,
      longitude: 75.8770,
      urgency_score: 23,
      urgency_label: "Low",
      created_at: "2025-09-02T16:20:00Z",
      status: "reported",
      reporter_id: "mock-user-4",
      reporter_name: "Sarah Wilson",
      image_url: "https://example.com/image4.jpg"
    }
  ];

  useEffect(() => {
    // Load current user and reports
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Get current user
        const user = await apiService.getCurrentUser();
        setCurrentUser(user);
        
        // Load reports based on view mode
        await loadReports();
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load data',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const loadReports = async () => {
    try {
      let reportsData: Report[] = [];
      
      if (viewMode === 'my-department') {
        try {
          reportsData = await apiService.getMyDepartmentReports();
        } catch (deptError) {
          console.warn('Department-based reports failed, falling back to general reports:', deptError);
          // Fallback to general admin reports if department-based fails
          reportsData = await apiService.getAdminReports();
        }
      } else {
        try {
          reportsData = await apiService.getOtherDepartmentReports();
        } catch (deptError) {
          console.warn('Other department reports failed, falling back to general reports:', deptError);
          // Fallback to general admin reports if department-based fails
          reportsData = await apiService.getAdminReports();
        }
      }
      
      setReports(reportsData);
      setFilteredReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reports',
        variant: 'destructive'
      });
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await loadReports();
      toast({
        title: 'Success',
        description: 'Reports refreshed successfully',
      });
    } catch (error) {
      console.error('Error refreshing reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh reports',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reload reports when view mode changes
  useEffect(() => {
    if (currentUser) {
      loadReports();
    }
  }, [viewMode, currentUser]);

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

    // Urgency filter
    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(report => report.urgency_label === urgencyFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Sort by urgency score (highest first)
    filtered.sort((a, b) => b.urgency_score - a.urgency_score);

    setFilteredReports(filtered);
  }, [reports, searchTerm, urgencyFilter, statusFilter]);

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setShowReportDialog(true);
  };

  const parseAsUtc = (input: string) => {
    if (!input) return null as any;
    let s = input.trim();
    if (!s.includes('T') && s.includes(' ')) s = s.replace(' ', 'T');
    const hasTz = /([+-]\d{2}:?\d{2}|Z)$/i.test(s);
    const normalized = hasTz ? s : `${s}Z`;
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  };

  const getTimePassed = (createdAt: string) => {
    try {
      const now = new Date();
      const created = parseAsUtc(createdAt) || new Date(createdAt);
      
      // Check if the date is valid
      if (isNaN(created.getTime())) {
        return 'Invalid Date';
      }
      
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
    } catch (error) {
      console.error('Error calculating time passed:', error, 'Input:', createdAt);
      return 'Error';
    }
  };

  const formatReportTime = (createdAt: string) => {
    try {
      const date = parseAsUtc(createdAt) || new Date(createdAt);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', createdAt);
        return {
          date: 'Invalid Date',
          time: 'Invalid Time'
        };
      }
      
      return {
        date: date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        time: date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      };
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', createdAt);
      return {
        date: 'Error',
        time: 'Error'
      };
    }
  };

  const handleUpdateStatus = async (reportId: number, newStatus: string) => {
    try {
      if (newStatus === 'resolved') {
        const rep = reports.find(r => r.id === reportId) || null;
        setReportToResolve(rep);
        setIsEvidenceModalOpen(true);
        return;
      }

      await apiService.updateReportStatus(reportId, newStatus, `Status updated to ${newStatus}`);
      await loadReports();

      toast({
        title: 'Status Updated',
        description: `Report status updated to ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update status',
        variant: 'destructive'
      });
      // Reload to reflect actual backend state in case of failure
      await loadReports();
    }
  };


  const getUrgencyStats = () => {
    const stats = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0
    };

    reports.forEach(report => {
      stats[report.urgency_label]++;
    });

    return stats;
  };

  const urgencyStats = getUrgencyStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <p className="text-gray-600">{t('message.loadingReports')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 py-4">
            <div className="flex items-center">
              <img 
                src="/src/assets/gov-logo.png" 
                alt="Government Logo" 
                className="w-12 h-12 sm:w-16 sm:h-16 mr-3" 
              />
              <img 
                src="/src/assets/crowdcare-logo.png" 
                alt="CrowdCare Logo" 
                className="w-12 h-12 sm:w-16 sm:h-16 mr-3" 
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">CrowdCare</h1>
                <p className="text-xs sm:text-sm text-gray-600">{t('admin.dashboard')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <PersonalDetailsSettings 
                user={currentUser} 
                onUserUpdate={setCurrentUser}
              />
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('common.logout')}</span>
                <span className="sm:hidden">{t('common.exit')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.dashboard')}</h2>
          <p className="text-gray-600">{t('admin.dashboardDesc')}</p>
          
          {/* Department View Toggle */}
          {currentUser && (
            <div className="mt-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">
                  {t('admin.department')}: <span className="text-green-600">{currentUser.department_name || 'General'}</span>
                </span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'my-department' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('my-department')}
                    className="text-xs"
                  >
                    {t('admin.myDepartmentIssues')}
                  </Button>
                  <Button
                    variant={viewMode === 'other-departments' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('other-departments')}
                    className="text-xs"
                  >
                    {t('admin.otherDepartments')}
                  </Button>
                  <Button
                    variant={viewMode === 'reviews' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('reviews')}
                    className="text-xs"
                  >
                    {t('admin.citizenReviews')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reviews Section */}
        {viewMode === 'reviews' ? (
          <AdminReviewSection />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Critical Issues</p>
                  <p className="text-2xl font-bold text-red-600">{urgencyStats.Critical}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold text-orange-600">{urgencyStats.High}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {reports.filter(r => r.status === 'in_progress').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {reports.filter(r => r.status === 'resolved').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
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
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgency Levels</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleRefresh} 
                disabled={isLoading}
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Community Reports ({filteredReports.length})
            </CardTitle>
            <CardDescription>
              Reports sorted by AI-powered urgency ranking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Report Created</TableHead>
                    <TableHead>Days Passed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow 
                      key={report.id} 
                      className={report.is_deleted ? 'opacity-60 bg-red-50 border-red-200 hover:bg-red-100' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            className={report.is_deleted ? 'opacity-50' : urgencyColors[report.urgency_label]}
                          >
                            {report.urgency_label}
                          </Badge>
                          <div className={`text-xs ${report.is_deleted ? 'text-gray-400' : 'text-gray-500'}`}>
                            {report.urgency_score}/100
                          </div>
                        </div>
                        <Progress 
                          value={report.urgency_score} 
                          className={`w-16 h-1 mt-1 ${report.is_deleted ? 'opacity-50' : ''}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          <span className={report.is_deleted ? 'line-through text-gray-500' : ''}>
                            {report.title}
                          </span>
                          {report.is_deleted && (
                            <Badge variant="destructive" className="text-xs bg-red-600 hover:bg-red-700">
                              DELETED
                            </Badge>
                          )}
                        </div>
                        <div className={`text-sm truncate max-w-xs ${report.is_deleted ? 'text-gray-400' : 'text-gray-500'}`}>
                          {report.description ? report.description.split('\n')[0] + '...' : 'No description available'}
                        </div>
                        {report.is_deleted && report.deletion_reason && (
                          <div className="text-xs text-red-700 font-medium mt-2 p-2 bg-red-100 rounded border-l-4 border-red-500">
                            <strong>Deletion Reason:</strong> {report.deletion_reason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={report.is_deleted ? 'opacity-50 border-gray-300' : ''}
                        >
                          {report.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={report.is_deleted ? 'text-gray-400' : ''}>
                          {report.reporter_name || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {report.is_deleted ? (
                          <Badge 
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700"
                          >
                            DELETED
                          </Badge>
                        ) : (
                          <Badge className={statusColors[report.status]}>
                            {report.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className={report.is_deleted ? 'text-gray-400' : ''}>
                            {formatReportTime(report.created_at).date}
                          </span>
                        </div>
                        <div className={`text-xs ${report.is_deleted ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatReportTime(report.created_at).time}
                        </div>
                        {report.is_deleted && report.deleted_at && (
                          <div className="text-xs text-red-600 font-medium">
                            Deleted: {formatReportTime(report.deleted_at).date}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm font-bold ${report.is_deleted ? 'text-gray-400' : 'text-red-600'}`}>
                          {getTimePassed(report.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {report.is_deleted ? (
                          <div className="flex items-center">
                            <Badge variant="destructive" className="px-3 py-1 text-xs bg-red-600">
                              No Actions Available
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewReport(report)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <div className="flex gap-2">
                              <Select
                                value={report.status}
                                onValueChange={(value) => handleUpdateStatus(report.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="reported">Reported</SelectItem>
                                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                  <SelectItem value="deleted">Deleted</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          </>
        )}

        {/* Report Detail Dialog */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                Report Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedReport && (
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 modal-scroll-container">
                {/* Quick Info Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
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
                    {selectedReport.is_deleted ? (
                      <Badge variant="destructive" className="bg-red-600 hover:bg-red-700">
                        DELETED
                      </Badge>
                    ) : (
                      <Badge className={statusColors[selectedReport.status]}>
                        {selectedReport.status.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Category</h4>
                    <Badge variant="outline">{selectedReport.category}</Badge>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Title</h4>
                    <p className="text-gray-700">{selectedReport.title}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Reporter</h4>
                    <p className="text-gray-700">{selectedReport.reporter_name || 'Unknown'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                  <p className="text-gray-700">
                    {selectedReport.latitude.toFixed(6)}, {selectedReport.longitude.toFixed(6)}
                  </p>
                </div>

                {/* Collapsible Description Section */}
                <div className="border rounded-lg">
                  <details className="group">
                    <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                      <h4 className="font-medium text-gray-900">Full Report Details</h4>
                      <span className="text-sm text-gray-500 group-open:hidden">Click to expand</span>
                      <span className="text-sm text-gray-500 hidden group-open:inline">Click to collapse</span>
                    </summary>
                    <div className="p-4 border-t bg-gray-50">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto modal-scroll-container">
                        {selectedReport.description}
                      </pre>
                    </div>
                  </details>
                </div>

                {/* Photo Evidence */}
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
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden text-sm text-gray-500 text-center py-4">
                        Image could not be loaded
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Report Created</h4>
                  <p className="text-gray-700">
                    {formatReportTime(selectedReport.created_at).date} at {formatReportTime(selectedReport.created_at).time}
                  </p>
                </div>

                {selectedReport.is_deleted && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-medium text-red-900 mb-2">Report Deleted by Citizen</h4>
                    <p className="text-red-800 mb-2">
                      <strong>Reason:</strong> {selectedReport.deletion_reason}
                    </p>
                    <p className="text-red-700 text-sm">
                      <strong>Deleted on:</strong> {selectedReport.deleted_at ? formatReportTime(selectedReport.deleted_at).date : 'Unknown'}
                    </p>
                    <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-800">
                      <strong>Note:</strong> This report has been taken back by the citizen. No further actions can be taken.
                    </div>
                  </div>
                )}

                {/* Fixed Footer */}
                <div className="flex-shrink-0 flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                    Close
                  </Button>
                  <Button onClick={() => setShowReportDialog(false)}>
                    Update Status
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>

      {/* Evidence Upload Modal for resolution */}
      {reportToResolve && (
        <EvidenceUploadModal
          isOpen={isEvidenceModalOpen}
          onClose={async () => {
            setIsEvidenceModalOpen(false);
            setReportToResolve(null);
            try {
              await loadReports();
            } catch (e) {
              // no-op
            }
          }}
          reportId={reportToResolve.id}
          reportTitle={reportToResolve.title}
          originalCoordinates={{
            latitude: reportToResolve.latitude,
            longitude: reportToResolve.longitude,
          }}
        />
      )}
    </div>
  );
}
