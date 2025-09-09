import { useState } from "react";
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
  FileText
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
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-primary">Department Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            {user?.department?.name || 'City Public Works Department'}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48" data-testid="select-department-filter">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Departments</SelectItem>
              <SelectItem value="roads_transportation">Public Works</SelectItem>
              <SelectItem value="parks_recreation">Parks & Recreation</SelectItem>
              <SelectItem value="public_safety">Public Safety</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export-reports">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {isConnected && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live Updates
            </Badge>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-accent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-accent" data-testid="metric-pending">
                  {stats?.new || 0}
                </h3>
                <p className="text-sm text-muted-foreground">Pending Issues</p>
              </div>
              <AlertTriangle className="text-accent text-2xl" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-primary" data-testid="metric-in-progress">
                  {stats?.inProgress || 0}
                </h3>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
              <Cog className="text-primary text-2xl" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-secondary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-secondary" data-testid="metric-resolved">
                  {stats?.resolved || 0}
                </h3>
                <p className="text-sm text-muted-foreground">Resolved This Month</p>
              </div>
              <CheckCircle className="text-secondary text-2xl" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-muted">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold" data-testid="metric-avg-resolution">
                  {stats?.avgResolutionTime || 0}
                </h3>
                <p className="text-sm text-muted-foreground">Avg Days to Resolve</p>
              </div>
              <Clock className="text-muted-foreground text-2xl" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues Management Table */}
      <Card className="shadow-lg overflow-hidden">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <CardTitle>Issue Management</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Issues ranked by: Priority (Urgent &gt; High &gt; Medium &gt; Low) → Upvotes → Date Created
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <Input
                placeholder="Search issues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64"
                data-testid="input-search-issues"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
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
              <Button variant="outline" size="sm" className="w-full sm:w-auto" data-testid="button-advanced-filter">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isLoading}
                className="w-full sm:w-auto"
                data-testid="button-refresh-issues"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading issues...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Upvotes</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIssues.map((issue: IssueWithDetails, index: number) => (
                    <TableRow key={issue.id} className="hover:bg-muted/10" data-testid={`row-issue-${issue.id}`}>
                      <TableCell className="text-center font-bold">
                        <Badge variant="secondary" className="font-mono">
                          #{index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {issue.images && issue.images.length > 0 ? (
                            <img
                              src={`/uploads/${issue.images[0].filePath}`}
                              alt="Issue"
                              className="w-12 h-8 object-cover rounded"
                              data-testid={`img-issue-thumbnail-${issue.id}`}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-8 bg-muted rounded flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">No image</span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium" data-testid={`text-issue-title-${issue.id}`}>
                              {issue.title}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Reported {formatISTDateTime(issue.createdAt)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ISSUE_CATEGORIES.find(c => c.value === issue.category)?.label}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-issue-location-${issue.id}`}>
                        {issue.location}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={issue.status} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge priority={issue.priority} />
                      </TableCell>
                      <TableCell className="text-sm text-center">
                        <Badge variant="outline" className="font-mono">
                          {issue.upvotes || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {issue.assignedTo?.firstName || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewIssue(issue)}
                            disabled={isDialogLoading}
                            data-testid={`button-view-issue-${issue.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-edit-issue-${issue.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          {issue.status !== 'resolved' ? (
                            <div className="flex gap-2">
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
                                <SelectTrigger className="w-28 h-8">
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
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleResolveIssue(issue)}
                                className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700"
                                title="Resolve issue - automatically determines if evidence is required"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Resolve
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="w-32 h-8 flex items-center justify-center">
                              Resolved
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          <div className="bg-muted/30 px-6 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-border">
            <div className="text-sm text-muted-foreground" data-testid="text-pagination-info">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredIssues.length)} of {filteredIssues.length} issues
            </div>
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                data-testid="button-previous-page"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <div className="flex space-x-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      data-testid={`button-page-${page}`}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SLA Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="w-2 h-6 bg-primary rounded mr-3"></div>
              SLA Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl text-muted-foreground mb-4">📊</div>
                <p className="text-muted-foreground">Interactive SLA tracking chart</p>
                <p className="text-sm text-muted-foreground mt-2">Shows resolution times by category</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Department Workload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="w-2 h-6 bg-secondary rounded mr-3"></div>
              Department Workload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Public Works', percentage: 75, color: 'bg-accent' },
                { name: 'Parks & Recreation', percentage: 45, color: 'bg-primary' },
                { name: 'Public Safety', percentage: 60, color: 'bg-secondary' },
                { name: 'Sanitation', percentage: 30, color: 'bg-primary' },
              ].map((dept) => (
                <div key={dept.name} className="flex items-center justify-between">
                  <span className="font-medium">{dept.name}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div 
                        className={`${dept.color} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${dept.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-muted-foreground w-8">{dept.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
