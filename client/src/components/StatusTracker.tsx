import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiService } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  MapPin, 
  Calendar,
  RefreshCw,
  Eye
} from "lucide-react";
import { StatusTimeline } from "@/types";
import { format } from "date-fns";
import { formatISTDateTime } from "@/lib/utils";

interface StatusTrackerProps {
  reportId: number;
  reportTitle: string;
  currentStatus: string;
}

export function StatusTracker({ reportId, reportTitle, currentStatus }: StatusTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [realTimeStatus, setRealTimeStatus] = useState(currentStatus);
  const [resolution, setResolution] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const { data: timeline, isLoading, refetch } = useQuery({
    queryKey: [`/reports/${reportId}/status-timeline`],
    queryFn: () => apiService.getReportStatusTimeline(reportId),
    refetchInterval: 30000, // Fallback polling every 30 seconds
  });

  // Fetch resolution details when resolved
  useEffect(() => {
    const loadResolution = async () => {
      try {
        if (realTimeStatus === 'resolved') {
          const data = await apiService.getPublicResolution(reportId);
          setResolution(data);
        }
      } catch (e) {
        // ignore
      }
    };
    loadResolution();
  }, [realTimeStatus, reportId]);

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    reportIds: [reportId],
    onStatusUpdate: (message) => {
      console.log('Real-time status update received:', message);
      setRealTimeStatus(message.new_status || currentStatus);
      // Invalidate and refetch timeline data
      queryClient.invalidateQueries({ queryKey: [`/reports/${reportId}/status-timeline`] });
    },
    onResolutionUpdate: (message) => {
      console.log('Real-time resolution update received:', message);
      setRealTimeStatus('resolved');
      // Invalidate and refetch timeline data
      queryClient.invalidateQueries({ queryKey: [`/reports/${reportId}/status-timeline`] });
      // Fetch resolution details
      apiService.getPublicResolution(reportId).then(setResolution).catch(() => {});
    }
  });

  const getStatusIcon = (status: string, isCompleted: boolean) => {
    if (isCompleted) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    
    switch (status) {
      case 'reported':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'acknowledged':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'in_progress':
        return <RefreshCw className="w-5 h-5 text-orange-600" />;
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string, isCompleted: boolean) => {
    if (isCompleted) {
      return "bg-green-100 text-green-800 border-green-200";
    }
    
    switch (status) {
      case 'reported':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'acknowledged':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'in_progress':
        return "bg-orange-100 text-orange-800 border-orange-200";
      case 'resolved':
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const calculateProgress = (timeline: StatusTimeline) => {
    const stages = ['reported', 'acknowledged', 'in_progress', 'resolved'];
    const completedStages = stages.filter(stage => 
      timeline.stages[stage as keyof typeof timeline.stages].status === 'completed'
    );
    return (completedStages.length / stages.length) * 100;
  };

  // Update real-time status when currentStatus prop changes
  useEffect(() => {
    setRealTimeStatus(currentStatus);
  }, [currentStatus]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded w-1/2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timeline) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Unable to load status information</p>
        </CardContent>
      </Card>
    );
  }

  const progress = calculateProgress(timeline);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Status Tracking
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'View Details'}
          </Button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getStatusColor(realTimeStatus, true)}>
              {realTimeStatus.charAt(0).toUpperCase() + realTimeStatus.slice(1).replace('_', ' ')}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {progress.toFixed(0)}% Complete
            </span>
            {isConnected && (
              <Badge variant="secondary" className="text-xs">
                Live
              </Badge>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Stages */}
        <div className="space-y-3">
          {Object.entries(timeline.stages).map(([stage, stageData]) => {
            const isCompleted = stageData.status === 'completed';
            const isCurrent = stage === currentStatus;
            
            return (
              <div
                key={stage}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isCurrent ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                }`}
              >
                {getStatusIcon(stage, isCompleted)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">
                      {stage.replace('_', ' ')}
                    </span>
                    {isCompleted && (
                      <Badge variant="secondary" className="text-xs">
                        Completed
                      </Badge>
                    )}
                    {isCurrent && !isCompleted && (
                      <Badge variant="outline" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stageData.notes}
                  </p>
                  {stageData.timestamp && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {formatISTDateTime(stageData.timestamp)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Status History</h4>
            <div className="space-y-2">
              {timeline.history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-2 bg-muted/20 rounded text-sm"
                >
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="flex-1">
                    <span className="font-medium capitalize">
                      {entry.status.replace('_', ' ')}
                    </span>
                    {entry.notes && (
                      <span className="text-muted-foreground ml-2">
                        - {entry.notes}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatISTDateTime(entry.changed_at)}</span>
                </div>
              ))}
            </div>

            {realTimeStatus === 'resolved' && resolution && (
              <div className="space-y-3 mt-4">
                <h4 className="font-medium text-sm text-muted-foreground">Resolution Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Resolved At:</span>{' '}
                      <span>{resolution.resolved_at}</span>
                    </div>
                    {resolution.admin_notes && (
                      <div className="text-sm">
                        <span className="font-medium">Admin Notes:</span>{' '}
                        <span>{resolution.admin_notes}</span>
                      </div>
                    )}
                    {resolution.resolution_coordinates && (
                      <div className="text-sm">
                        <span className="font-medium">Verified GPS:</span>{' '}
                        <span>
                          {resolution.resolution_coordinates.latitude?.toFixed?.(6) || ''}, {' '}
                          {resolution.resolution_coordinates.longitude?.toFixed?.(6) || ''}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    {resolution.resolution_image_url && (
                      <img
                        src={resolution.resolution_image_url.startsWith('http') ? resolution.resolution_image_url : `http://localhost:8000${resolution.resolution_image_url}`}
                        alt="Resolution evidence"
                        className="w-full h-40 object-cover rounded border"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Connection status indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          {isConnected ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live updates enabled</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              <span>Auto-refreshing every 30 seconds</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
