import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IssueReportForm } from "./IssueReportForm";
import { IssuesMap } from "./IssuesMap";
import { IssueCard } from "./IssueCard";
import { StatusBadge } from "./StatusBadge";
import { StatusTracker } from "./StatusTracker";
import { useAuth } from "@/hooks/useAuth";
import { Camera, Map, History, Download, Heart } from "lucide-react";
import type { IssueWithDetails } from "@shared/schema";

export function CitizenPanel() {
  const [showReportForm, setShowReportForm] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showStatusTracker, setShowStatusTracker] = useState(false);
  const [selectedReportForTracking, setSelectedReportForTracking] = useState<IssueWithDetails | null>(null);
  const { user } = useAuth();

  // Fetch user's issues
  const { data: userIssues = [], isLoading: isLoadingUserIssues } = useQuery({
    queryKey: ['/api/users/me/issues'],
    enabled: !!user,
  });

  // Fetch nearby issues for map
  const { data: nearbyIssues = [], isLoading: isLoadingNearby } = useQuery({
    queryKey: ['/api/issues/nearby'],
    queryFn: async () => {
      // Get user's location first (simplified for demo)
      const response = await fetch('/api/issues/nearby?lat=40.7128&lng=-74.0060&radius=5');
      return response.json();
    },
  });

  const handleUpvoteIssue = async (issueId: string) => {
    try {
      await fetch(`/api/issues/${issueId}/upvote`, {
        method: 'POST',
        credentials: 'include',
      });
      // Refresh data would happen here
    } catch (error) {
      console.error('Failed to upvote issue:', error);
    }
  };

  const handleTrackStatus = (issue: IssueWithDetails) => {
    setSelectedReportForTracking(issue);
    setShowStatusTracker(true);
  };

  if (showReportForm) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary">Report an Issue</h2>
          <Button
            variant="outline"
            onClick={() => setShowReportForm(false)}
            data-testid="button-back-to-dashboard"
          >
            Back to Dashboard
          </Button>
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          <IssueReportForm
            onSuccess={() => setShowReportForm(false)}
            className="lg:col-span-1"
          />
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Reporting Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Take Clear Photos</h4>
                    <p className="text-sm text-muted-foreground">Include multiple angles and show the full context of the problem.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Be Specific</h4>
                    <p className="text-sm text-muted-foreground">Provide exact location details and describe what you observe.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Check for Duplicates</h4>
                    <p className="text-sm text-muted-foreground">Look at the map to see if someone has already reported this issue.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (showMap) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary">Community Issues Map</h2>
          <Button
            variant="outline"
            onClick={() => setShowMap(false)}
            data-testid="button-back-from-map"
          >
            Back to Dashboard
          </Button>
        </div>
        <IssuesMap issues={nearbyIssues} />
      </div>
    );
  }

  if (showStatusTracker && selectedReportForTracking) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary">Track Issue Status</h2>
          <Button
            variant="outline"
            onClick={() => {
              setShowStatusTracker(false);
              setSelectedReportForTracking(null);
            }}
            data-testid="button-back-from-tracking"
          >
            Back to Dashboard
          </Button>
        </div>
        <StatusTracker
          reportId={selectedReportForTracking.id}
          reportTitle={selectedReportForTracking.title}
          currentStatus={selectedReportForTracking.status}
        />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Mobile-First Dashboard */}
      <div className="max-w-sm mx-auto lg:mx-0">
        <Card className="shadow-lg overflow-hidden">
          {/* Header */}
          <div className="gradient-bg p-6 text-center">
            <h2 className="text-2xl font-bold text-primary-foreground mb-2">Report an Issue</h2>
            <p className="text-primary-foreground/80">Help improve your community</p>
          </div>
          
          {/* Quick Actions */}
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                className="card-hover bg-accent/10 border border-accent/20 rounded-lg p-4 h-auto flex-col hover:bg-accent/20 transition-colors"
                variant="ghost"
                onClick={() => setShowReportForm(true)}
                data-testid="button-report-issue"
              >
                <Camera className="text-accent text-2xl mb-2" />
                <span className="text-sm font-medium">Report Issue</span>
              </Button>
              <Button
                className="card-hover bg-secondary/10 border border-secondary/20 rounded-lg p-4 h-auto flex-col hover:bg-secondary/20 transition-colors"
                variant="ghost"
                onClick={() => setShowMap(true)}
                data-testid="button-view-map"
              >
                <Map className="text-secondary text-2xl mb-2" />
                <span className="text-sm font-medium">View Map</span>
              </Button>
            </div>
            
            {/* Recent Reports */}
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <History className="text-muted-foreground mr-2" />
                Your Recent Reports
              </h3>
              
              {isLoadingUserIssues ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-3 animate-pulse">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : userIssues.length > 0 ? (
                <div className="space-y-3" data-testid="user-recent-reports">
                  {userIssues.slice(0, 3).map((issue: IssueWithDetails) => (
                    <div key={issue.id} className="bg-muted/30 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm line-clamp-1" data-testid={`text-recent-title-${issue.id}`}>
                          {issue.title}
                        </span>
                        <StatusBadge status={issue.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mb-2" data-testid={`text-recent-date-${issue.id}`}>
                        Reported {new Date(issue.createdAt).toLocaleDateString()}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => handleTrackStatus(issue)}
                        data-testid={`button-track-status-${issue.id}`}
                      >
                        Track Status
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">No reports yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setShowReportForm(true)}
                    data-testid="button-create-first-report"
                  >
                    Create your first report
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* PWA Install Banner */}
        <div className="mt-6 bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Download className="text-primary text-xl" />
            <div className="flex-1">
              <h4 className="font-semibold text-primary">Install CrowdCare</h4>
              <p className="text-sm text-muted-foreground">Get instant access from your home screen</p>
            </div>
            <Button 
              size="sm" 
              className="px-3 py-1 text-sm"
              data-testid="button-install-pwa"
            >
              Install
            </Button>
          </div>
        </div>
      </div>
      
      {/* Community Activity Feed */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Community Activity</span>
              <Badge variant="secondary" data-testid="badge-activity-count">
                {nearbyIssues.length} nearby issues
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingNearby ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-muted rounded-lg"></div>
                </div>
              ))
            ) : nearbyIssues.length > 0 ? (
              nearbyIssues.slice(0, 5).map((issue: IssueWithDetails) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onUpvote={handleUpvoteIssue}
                  compact
                />
              ))
            ) : (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No issues in your area</p>
                <p className="text-sm text-muted-foreground">Be the first to report something!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
