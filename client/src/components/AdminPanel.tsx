import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "./StatusBadge";
import { EvidenceUploadModal } from "./EvidenceUploadModal";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { apiService } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, 
  Cog, 
  CheckCircle, 
  Clock, 
  Download, 
  Filter, 
  Search, 
  Eye, 
  Edit, 
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  TrendingUp,
  Users,
  Shield,
  BarChart3,
  Activity
} from "lucide-react";
import type { IssueWithDetails } from "@shared/schema";
import { ISSUE_CATEGORIES, ISSUE_STATUSES } from "@/types";
import { formatISTDateTime } from "@/lib/utils";

export function AdminPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState<IssueWithDetails | null>(null);
  const [isDialogLoading, setIsDialogLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [issueToResolve, setIssueToResolve] = useState<IssueWithDetails | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    },
    hover: {
      scale: 1.02,
      y: -5,
      transition: {
        duration: 0.2,
        ease: "easeInOut"
      }
    }
  };
  
  const itemsPerPage = 10;

  // Fetch issues
  const { data: issues = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/issues', { 
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage
    }],
    refetchInterval: 30000, // Fallback polling every 30 seconds
  });

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    reportIds: issues.map((issue: any) => issue.id),
    onStatusUpdate: (message) => {
      console.log('Real-time status update received in admin panel:', message);
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats'] });
    },
    onResolutionUpdate: (message) => {
      console.log('Real-time resolution update received in admin panel:', message);
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats'] });
    }
  });

  // Fetch analytics
  const { data: stats } = useQuery({
    queryKey: ['/api/analytics/stats'],
  });

  // Update issue status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ issueId, status, notes }: { 
      issueId: number; 
      status: string; 
      notes?: string;
    }) => {
      return apiService.updateReportStatus(issueId, status, notes);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Issue status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update issue status",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (issueId: number, newStatus: string) => {
    updateStatusMutation.mutate({
      issueId,
      status: newStatus,
      notes: `Status updated to ${newStatus}`,
    });
  };

  const handleResolveIssue = (issue: IssueWithDetails) => {
    console.log('handleResolveIssue called with issue:', issue);
    setIssueToResolve(issue);
    setIsEvidenceModalOpen(true);
    console.log('Modal should be opening now');
  };


  const handleViewIssue = (issue: IssueWithDetails) => {
    setIsDialogLoading(true);
    setSelectedIssue(issue);
    setIsDialogOpen(true);
    // Small delay to prevent rapid state changes
    setTimeout(() => setIsDialogLoading(false), 100);
  };

  const downloadIssueReport = async (issue: IssueWithDetails) => {
    try {
      // Create a simple HTML report
      const reportHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Issue Report - ${issue.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .section h3 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .field { margin-bottom: 10px; }
            .field strong { display: inline-block; width: 120px; }
            .images { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
            .image { max-width: 100%; height: auto; border: 1px solid #ccc; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Issue Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="section">
            <h3>Issue Details</h3>
            <div class="field"><strong>Title:</strong> ${issue.title}</div>
            <div class="field"><strong>Description:</strong> ${issue.description}</div>
            <div class="field"><strong>Category:</strong> ${ISSUE_CATEGORIES.find(c => c.value === issue.category)?.label || issue.category}</div>
            <div class="field"><strong>Status:</strong> ${issue.status}</div>
            <div class="field"><strong>Priority:</strong> ${issue.priority}</div>
            <div class="field"><strong>Location:</strong> ${issue.location}</div>
            <div class="field"><strong>Upvotes:</strong> ${issue.upvotes || 0}</div>
            <div class="field"><strong>Reported:</strong> ${new Date(issue.createdAt).toLocaleDateString()}</div>
          </div>
          
          <div class="section">
            <h3>Reporter Information</h3>
            <div class="field"><strong>Name:</strong> ${issue.reportedBy?.firstName || ''} ${issue.reportedBy?.lastName || ''}</div>
            <div class="field"><strong>Email:</strong> ${issue.reportedBy?.email || 'N/A'}</div>
          </div>
          
          ${issue.images && issue.images.length > 0 ? `
          <div class="section">
            <h3>Evidence Images</h3>
            <div class="images">
              ${issue.images.map((img, idx) => `
                <div>
                  <img src="/uploads/${img.filePath}" alt="Evidence ${idx + 1}" class="image" />
                  <p style="text-align: center; font-size: 12px; margin-top: 5px;">Evidence ${idx + 1}</p>
                </div>
              `).join('')}
            </div>
          </div>
          ` : `
          <div class="section">
            <h3>Evidence Images</h3>
            <p>No images uploaded</p>
          </div>
          `}
          
          <div class="section">
            <h3>Department Information</h3>
            <div class="field"><strong>Department:</strong> ${issue.department?.name || 'Unassigned'}</div>
            <div class="field"><strong>Assigned To:</strong> ${issue.assignedTo?.firstName || 'Unassigned'}</div>
          </div>
        </body>
        </html>
      `;

      // Create a blob and download
      const blob = new Blob([reportHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `issue-report-${issue.id}-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Issue report downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      });
    }
  };

  const filteredIssues = issues.filter((issue: IssueWithDetails) =>
    issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
    >
      {/* Enhanced Header */}
      <motion.div 
        className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6"
        variants={itemVariants}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Department Dashboard
          </h2>
          <p className="text-gray-600 mt-2 text-lg">
            {user?.department?.name || 'City Public Works Department'}
          </p>
        </motion.div>
        <motion.div 
          className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 bg-white/80 border-gray-200" data-testid="select-department-filter">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Departments</SelectItem>
                <SelectItem value="roads_transportation">Public Works</SelectItem>
                <SelectItem value="parks_recreation">Parks & Recreation</SelectItem>
                <SelectItem value="public_safety">Public Safety</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="outline" 
              data-testid="button-export-reports"
              className="bg-white/80 hover:bg-white border-gray-200"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </motion.div>
          {isConnected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <Badge variant="secondary" className="flex items-center gap-2 bg-green-100 text-green-800 border-green-200">
                <motion.div 
                  className="w-2 h-2 bg-green-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                Live Updates
              </Badge>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Enhanced Key Metrics */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={containerVariants}
      >
        <motion.div
          variants={cardVariants}
          whileHover="hover"
        >
          <Card className="border-l-4 border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <motion.h3 
                    className="text-3xl font-bold text-orange-600" 
                    data-testid="metric-pending"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    {stats?.new || 0}
                  </motion.h3>
                  <p className="text-sm text-orange-700 font-medium">Pending Issues</p>
                </div>
                <motion.div
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  <AlertTriangle className="text-orange-600 text-3xl" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          variants={cardVariants}
          whileHover="hover"
        >
          <Card className="border-l-4 border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <motion.h3 
                    className="text-3xl font-bold text-blue-600" 
                    data-testid="metric-in-progress"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    {stats?.inProgress || 0}
                  </motion.h3>
                  <p className="text-sm text-blue-700 font-medium">In Progress</p>
                </div>
                <motion.div
                  whileHover={{ rotate: -10, scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Cog className="text-blue-600 text-3xl" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          variants={cardVariants}
          whileHover="hover"
        >
          <Card className="border-l-4 border-green-500 bg-gradient-to-br from-green-50 to-green-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <motion.h3 
                    className="text-3xl font-bold text-green-600" 
                    data-testid="metric-resolved"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    {stats?.resolved || 0}
                  </motion.h3>
                  <p className="text-sm text-green-700 font-medium">Resolved This Month</p>
                </div>
                <motion.div
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  <CheckCircle className="text-green-600 text-3xl" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          variants={cardVariants}
          whileHover="hover"
        >
          <Card className="border-l-4 border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <motion.h3 
                    className="text-3xl font-bold text-purple-600" 
                    data-testid="metric-avg-resolution"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    {stats?.avgResolutionTime || 0}
                  </motion.h3>
                  <p className="text-sm text-purple-700 font-medium">Avg Days to Resolve</p>
                </div>
                <motion.div
                  whileHover={{ rotate: -10, scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Clock className="text-purple-600 text-3xl" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Enhanced Issues Management Table */}
      <motion.div
        variants={cardVariants}
        whileHover="hover"
      >
        <Card className="shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm border-gray-200">
          <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <motion.div 
              className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800">Issue Management</CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  Issues ranked by: Priority (Urgent &gt; High &gt; Medium &gt; Low) → Upvotes → Date Created
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Input
                    placeholder="Search issues..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 bg-white border-gray-200"
                    data-testid="input-search-issues"
                  />
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40 bg-white border-gray-200" data-testid="select-status-filter">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Status</SelectItem>
                      {ISSUE_STATUSES.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full sm:w-auto bg-white hover:bg-gray-50 border-gray-200" 
                    data-testid="button-advanced-filter"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="w-full sm:w-auto bg-white hover:bg-gray-50 border-gray-200"
                    data-testid="button-refresh-issues"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            <motion.div 
              className="p-12 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div 
                className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <p className="text-gray-600 mt-4 font-medium">Loading issues...</p>
            </motion.div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <TableRow>
                    <TableHead className="w-12 font-semibold text-gray-800">Rank</TableHead>
                    <TableHead className="font-semibold text-gray-800">Issue</TableHead>
                    <TableHead className="font-semibold text-gray-800">Category</TableHead>
                    <TableHead className="font-semibold text-gray-800">Location</TableHead>
                    <TableHead className="font-semibold text-gray-800">Status</TableHead>
                    <TableHead className="font-semibold text-gray-800">Priority</TableHead>
                    <TableHead className="font-semibold text-gray-800">Upvotes</TableHead>
                    <TableHead className="font-semibold text-gray-800">Assigned</TableHead>
                    <TableHead className="font-semibold text-gray-800">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredIssues.map((issue: IssueWithDetails, index: number) => (
                      <motion.tr 
                        key={issue.id} 
                        className="hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100" 
                        data-testid={`row-issue-${issue.id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ scale: 1.01, backgroundColor: "rgba(249, 250, 251, 0.8)" }}
                      >
                        <TableCell className="text-center font-bold py-4">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Badge variant="secondary" className="font-mono bg-gradient-to-r from-blue-100 to-green-100 text-blue-800 border-blue-200">
                              #{index + 1}
                            </Badge>
                          </motion.div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-3">
                            {issue.images && issue.images.length > 0 ? (
                              <motion.img
                                src={`/uploads/${issue.images[0].filePath}`}
                                alt="Issue"
                                className="w-12 h-8 object-cover rounded shadow-sm"
                                data-testid={`img-issue-thumbnail-${issue.id}`}
                                loading="lazy"
                                whileHover={{ scale: 1.1 }}
                                transition={{ duration: 0.2 }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center border border-gray-200">
                                <span className="text-xs text-gray-500">No image</span>
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-gray-800" data-testid={`text-issue-title-${issue.id}`}>
                                {issue.title}
                              </div>
                              <div className="text-sm text-gray-600">
                                Reported {formatISTDateTime(issue.createdAt)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm py-4">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {ISSUE_CATEGORIES.find(c => c.value === issue.category)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm py-4 text-gray-700" data-testid={`text-issue-location-${issue.id}`}>
                          {issue.location}
                        </TableCell>
                        <TableCell className="py-4">
                          <StatusBadge status={issue.status} />
                        </TableCell>
                        <TableCell className="py-4">
                          <StatusBadge priority={issue.priority} />
                        </TableCell>
                        <TableCell className="text-sm text-center py-4">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Badge variant="outline" className="font-mono bg-green-50 text-green-700 border-green-200">
                              {issue.upvotes || 0}
                            </Badge>
                          </motion.div>
                        </TableCell>
                        <TableCell className="text-sm py-4 text-gray-700">
                          {issue.assignedTo?.firstName || 'Unassigned'}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-2">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewIssue(issue)}
                                disabled={isDialogLoading}
                                data-testid={`button-view-issue-${issue.id}`}
                                className="hover:bg-blue-100 hover:text-blue-700"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </motion.div>
                            
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`button-edit-issue-${issue.id}`}
                                className="hover:bg-green-100 hover:text-green-700"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </motion.div>
                            
                            {issue.status !== 'resolved' ? (
                              <div className="flex gap-2">
                                <motion.div
                                  whileHover={{ scale: 1.02 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Select
                                    value={issue.status}
                                    onValueChange={(newStatus) => {
                                      console.log('Status changed to:', newStatus);
                                      if (newStatus === 'resolved') {
                                        handleResolveIssue(issue);
                                      } else {
                                        handleStatusUpdate(issue.id, newStatus);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-28 h-8 bg-white border-gray-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ISSUE_STATUSES.map(status => (
                                        <SelectItem key={status.value} value={status.value}>
                                          {status.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </motion.div>
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleResolveIssue(issue)}
                                    className="h-8 px-3 text-xs bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md"
                                    title="Resolve issue - automatically determines if evidence is required"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Resolve
                                  </Button>
                                </motion.div>
                              </div>
                            ) : (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                              >
                                <Badge variant="secondary" className="w-32 h-8 flex items-center justify-center bg-green-100 text-green-800 border-green-200">
                                  Resolved
                                </Badge>
                              </motion.div>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Enhanced Pagination */}
          <motion.div 
            className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-t border-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="text-sm text-gray-600 font-medium" data-testid="text-pagination-info">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredIssues.length)} of {filteredIssues.length} issues
            </div>
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-previous-page"
                  className="bg-white hover:bg-gray-50 border-gray-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
              </motion.div>
              <div className="flex space-x-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <motion.div
                      key={page}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        data-testid={`button-page-${page}`}
                        className={currentPage === page 
                          ? "bg-blue-600 hover:bg-blue-700 text-white" 
                          : "bg-white hover:bg-gray-50 border-gray-200"
                        }
                      >
                        {page}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                  className="bg-white hover:bg-gray-50 border-gray-200"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Enhanced Analytics Section */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        variants={containerVariants}
      >
        {/* SLA Performance Chart */}
        <motion.div
          variants={cardVariants}
          whileHover="hover"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
              <CardTitle className="flex items-center text-gray-800">
                <motion.div 
                  className="w-3 h-8 bg-gradient-to-b from-blue-500 to-green-500 rounded mr-3"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                />
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                SLA Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <motion.div 
                className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border border-gray-200"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                <div className="text-center">
                  <motion.div 
                    className="text-6xl mb-4"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    📊
                  </motion.div>
                  <p className="text-gray-600 font-medium">Interactive SLA tracking chart</p>
                  <p className="text-sm text-gray-500 mt-2">Shows resolution times by category</p>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Department Workload */}
        <motion.div
          variants={cardVariants}
          whileHover="hover"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
              <CardTitle className="flex items-center text-gray-800">
                <motion.div 
                  className="w-3 h-8 bg-gradient-to-b from-green-500 to-blue-500 rounded mr-3"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                />
                <Users className="w-5 h-5 mr-2 text-green-600" />
                Department Workload
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {[
                  { name: 'Public Works', percentage: 75, color: 'bg-gradient-to-r from-orange-400 to-orange-500' },
                  { name: 'Parks & Recreation', percentage: 45, color: 'bg-gradient-to-r from-blue-400 to-blue-500' },
                  { name: 'Public Safety', percentage: 60, color: 'bg-gradient-to-r from-green-400 to-green-500' },
                  { name: 'Sanitation', percentage: 30, color: 'bg-gradient-to-r from-purple-400 to-purple-500' },
                ].map((dept, index) => (
                  <motion.div 
                    key={dept.name} 
                    className="flex items-center justify-between"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 1.0 + index * 0.1 }}
                  >
                    <span className="font-semibold text-gray-800">{dept.name}</span>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-200 rounded-full h-3 shadow-inner">
                        <motion.div 
                          className={`${dept.color} h-3 rounded-full shadow-sm`}
                          initial={{ width: 0 }}
                          animate={{ width: `${dept.percentage}%` }}
                          transition={{ duration: 1, delay: 1.2 + index * 0.1, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-600 w-8">{dept.percentage}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Single Dialog for Issue Details */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setSelectedIssue(null);
          setIsDialogLoading(false);
        }
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <div className="flex justify-between items-center">
              <DialogTitle>Issue Details</DialogTitle>
              {selectedIssue && !isDialogLoading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadIssueReport(selectedIssue)}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Download PDF
                </Button>
              )}
            </div>
          </DialogHeader>
          {selectedIssue && !isDialogLoading ? (
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 modal-scroll-container">
              {/* Issue Title and Description */}
              <div className="border-b pb-3">
                <h3 className="text-lg font-semibold mb-2">{selectedIssue.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{selectedIssue.description}</p>
              </div>
              
              {/* Issue Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-muted-foreground">Category:</strong>
                    <span className="text-sm font-medium">{ISSUE_CATEGORIES.find(c => c.value === selectedIssue.category)?.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-muted-foreground">Status:</strong>
                    <StatusBadge status={selectedIssue.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-muted-foreground">Priority:</strong>
                    <StatusBadge priority={selectedIssue.priority} />
                  </div>
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-muted-foreground">Upvotes:</strong>
                    <span className="text-sm font-medium">{selectedIssue.upvotes || 0}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-muted-foreground">Location:</strong>
                    <span className="text-sm font-medium text-right">{selectedIssue.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-muted-foreground">Reported:</strong>
                    <span className="text-sm font-medium">{formatISTDateTime(selectedIssue.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-muted-foreground">Department:</strong>
                    <span className="text-sm font-medium">{selectedIssue.department?.name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-muted-foreground">Assigned To:</strong>
                    <span className="text-sm font-medium">{selectedIssue.assignedTo?.firstName || 'Unassigned'}</span>
                  </div>
                </div>
              </div>
              {/* Evidence Images */}
              <div className="border-t pt-3">
                <h4 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wide">Evidence Images</h4>
                {selectedIssue.images && selectedIssue.images.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedIssue.images.map((img, idx) => (
                      <div key={idx} className="space-y-1">
                        <img
                          src={`/uploads/${img.filePath}`}
                          alt={`Evidence ${idx + 1}`}
                          className="w-full h-32 object-cover rounded border"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <p className="text-xs text-muted-foreground text-center">Evidence {idx + 1}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-muted/20 rounded">
                    <p className="text-xs text-muted-foreground">No images uploaded</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading issue details...</span>
            </div>
          )}
          
          {/* Fixed Footer */}
          {selectedIssue && !isDialogLoading && (
            <div className="flex-shrink-0 flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>
                Update Status
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Evidence Upload Modal */}
      {issueToResolve && (
        <EvidenceUploadModal
          isOpen={isEvidenceModalOpen}
          onClose={() => {
            console.log('Closing evidence modal');
            setIsEvidenceModalOpen(false);
            setIssueToResolve(null);
          }}
          reportId={issueToResolve.id}
          reportTitle={issueToResolve.title}
          originalCoordinates={{
            latitude: issueToResolve.latitude || 0,
            longitude: issueToResolve.longitude || 0
          }}
        />
      )}
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black text-white p-2 text-xs rounded">
          <div>Modal Open: {isEvidenceModalOpen ? 'Yes' : 'No'}</div>
          <div>Issue to Resolve: {issueToResolve ? issueToResolve.id : 'None'}</div>
        </div>
      )}
    </motion.div>
  );
}
