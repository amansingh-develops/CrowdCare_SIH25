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
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  ChevronRight
} from "lucide-react";
import type { IssueWithDetails } from "@shared/schema";
import { ISSUE_CATEGORIES, ISSUE_STATUSES } from "@/types";
import { formatDistanceToNow } from "date-fns";

export function AdminPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState<IssueWithDetails | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const itemsPerPage = 10;

  // Fetch issues
  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['/api/issues', { 
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage
    }],
  });

  // Fetch analytics
  const { data: stats } = useQuery({
    queryKey: ['/api/analytics/stats'],
  });

  // Update issue status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ issueId, status, comment }: { 
      issueId: string; 
      status: string; 
      comment?: string;
    }) => {
      return apiRequest('PATCH', `/api/issues/${issueId}/status`, { 
        status, 
        comment 
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Issue status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update issue status",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (issueId: string, newStatus: string) => {
    updateStatusMutation.mutate({
      issueId,
      status: newStatus,
      comment: `Status updated to ${newStatus}`,
    });
  };

  const handleViewIssue = (issue: IssueWithDetails) => {
    setSelectedIssue(issue);
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
          <div className="flex justify-between items-center">
            <CardTitle>Issue Management</CardTitle>
            <div className="flex items-center space-x-3">
              <Input
                placeholder="Search issues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
                data-testid="input-search-issues"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
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
              <Button variant="outline" size="sm" data-testid="button-advanced-filter">
                <Filter className="w-4 h-4 mr-2" />
                Filter
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
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.map((issue: IssueWithDetails) => (
                  <TableRow key={issue.id} className="hover:bg-muted/10" data-testid={`row-issue-${issue.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {issue.images && issue.images.length > 0 && (
                          <img
                            src={`/uploads/${issue.images[0].filePath}`}
                            alt="Issue"
                            className="w-12 h-8 object-cover rounded"
                            data-testid={`img-issue-thumbnail-${issue.id}`}
                          />
                        )}
                        <div>
                          <div className="font-medium" data-testid={`text-issue-title-${issue.id}`}>
                            {issue.title}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Reported {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
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
                    <TableCell className="text-sm">
                      {issue.assignedTo?.firstName || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedIssue(issue)}
                              data-testid={`button-view-issue-${issue.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Issue Details</DialogTitle>
                            </DialogHeader>
                            {selectedIssue && (
                              <div className="space-y-4">
                                <div>
                                  <h3 className="font-semibold">{selectedIssue.title}</h3>
                                  <p className="text-muted-foreground">{selectedIssue.description}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <strong>Category:</strong> {ISSUE_CATEGORIES.find(c => c.value === selectedIssue.category)?.label}
                                  </div>
                                  <div>
                                    <strong>Location:</strong> {selectedIssue.location}
                                  </div>
                                  <div>
                                    <strong>Status:</strong> <StatusBadge status={selectedIssue.status} />
                                  </div>
                                  <div>
                                    <strong>Priority:</strong> <StatusBadge priority={selectedIssue.priority} />
                                  </div>
                                </div>
                                {selectedIssue.images && selectedIssue.images.length > 0 && (
                                  <div>
                                    <strong>Images:</strong>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                      {selectedIssue.images.map((img, idx) => (
                                        <img
                                          key={idx}
                                          src={`/uploads/${img.filePath}`}
                                          alt={`Evidence ${idx + 1}`}
                                          className="w-full h-32 object-cover rounded"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`button-edit-issue-${issue.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <Select
                          value={issue.status}
                          onValueChange={(newStatus) => handleStatusUpdate(issue.id, newStatus)}
                        >
                          <SelectTrigger className="w-32 h-8">
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Pagination */}
          <div className="bg-muted/30 px-6 py-3 flex justify-between items-center border-t border-border">
            <div className="text-sm text-muted-foreground" data-testid="text-pagination-info">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredIssues.length)} of {filteredIssues.length} issues
            </div>
            <div className="flex items-center space-x-2">
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
    </div>
  );
}
