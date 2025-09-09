import { useState, useEffect } from "react";
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
import { Camera, Map, History, Download, Heart, Plus, TrendingUp, Users, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { IssueWithDetails } from "@shared/schema";

export function CitizenPanel() {
  const [showReportForm, setShowReportForm] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showStatusTracker, setShowStatusTracker] = useState(false);
  const [selectedReportForTracking, setSelectedReportForTracking] = useState<IssueWithDetails | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuth();

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
      <motion.div 
        className="space-y-8"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Report an Issue
          </h2>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="outline"
              onClick={() => setShowReportForm(false)}
              data-testid="button-back-to-dashboard"
              className="bg-white/80 hover:bg-white border-gray-200"
            >
              Back to Dashboard
            </Button>
          </motion.div>
        </motion.div>
        <motion.div 
          className="grid lg:grid-cols-2 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <IssueReportForm
              onSuccess={() => setShowReportForm(false)}
              className="lg:col-span-1"
            />
          </motion.div>
          <motion.div 
            className="lg:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">Reporting Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  {
                    number: "1",
                    title: "Take Clear Photos",
                    description: "Include multiple angles and show the full context of the problem."
                  },
                  {
                    number: "2", 
                    title: "Be Specific",
                    description: "Provide exact location details and describe what you observe."
                  },
                  {
                    number: "3",
                    title: "Check for Duplicates", 
                    description: "Look at the map to see if someone has already reported this issue."
                  }
                ].map((tip, index) => (
                  <motion.div 
                    key={tip.number}
                    className="flex items-start space-x-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                    whileHover={{ x: 5 }}
                  >
                    <motion.div 
                      className="w-8 h-8 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center mt-1 shadow-sm"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                        {tip.number}
                      </span>
                    </motion.div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">{tip.title}</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{tip.description}</p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  if (showMap) {
    return (
      <motion.div 
        className="space-y-8"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Community Issues Map
          </h2>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="outline"
              onClick={() => setShowMap(false)}
              data-testid="button-back-from-map"
              className="bg-white/80 hover:bg-white border-gray-200"
            >
              Back to Dashboard
            </Button>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <IssuesMap issues={nearbyIssues} />
        </motion.div>
      </motion.div>
    );
  }

  if (showStatusTracker && selectedReportForTracking) {
    return (
      <motion.div 
        className="space-y-8"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Track Issue Status
          </h2>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusTracker(false);
                setSelectedReportForTracking(null);
              }}
              data-testid="button-back-from-tracking"
              className="bg-white/80 hover:bg-white border-gray-200"
            >
              Back to Dashboard
            </Button>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <StatusTracker
            reportId={selectedReportForTracking.id}
            reportTitle={selectedReportForTracking.title}
            currentStatus={selectedReportForTracking.status}
          />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="grid lg:grid-cols-2 gap-8"
      variants={containerVariants}
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
    >
      {/* Mobile-First Dashboard */}
      <motion.div 
        className="max-w-sm mx-auto lg:mx-0"
        variants={itemVariants}
      >
        <motion.div
          variants={cardVariants}
          whileHover="hover"
        >
          <Card className="shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm border-gray-200">
            {/* Header */}
            <motion.div 
              className="bg-gradient-to-r from-blue-600 to-green-600 p-6 text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-white mb-2">Report an Issue</h2>
              <p className="text-white/90">Help improve your community</p>
            </motion.div>
            
            {/* Quick Actions */}
            <CardContent className="p-6 space-y-6">
              <motion.div 
                className="grid grid-cols-2 gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 h-auto flex-col hover:from-blue-100 hover:to-blue-200 transition-all duration-300 shadow-md hover:shadow-lg"
                    variant="ghost"
                    onClick={() => setShowReportForm(true)}
                    data-testid="button-report-issue"
                  >
                    <motion.div
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Camera className="text-blue-600 text-3xl mb-3" />
                    </motion.div>
                    <span className="text-sm font-semibold text-blue-800">Report Issue</span>
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 h-auto flex-col hover:from-green-100 hover:to-green-200 transition-all duration-300 shadow-md hover:shadow-lg"
                    variant="ghost"
                    onClick={() => setShowMap(true)}
                    data-testid="button-view-map"
                  >
                    <motion.div
                      whileHover={{ rotate: -10, scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Map className="text-green-600 text-3xl mb-3" />
                    </motion.div>
                    <span className="text-sm font-semibold text-green-800">View Map</span>
                  </Button>
                </motion.div>
              </motion.div>
              
              {/* Recent Reports */}
              <motion.div 
                className="border-t border-gray-200 pt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <h3 className="font-semibold mb-4 flex items-center text-gray-800">
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <History className="text-gray-600 mr-3" />
                  </motion.div>
                  Your Recent Reports
                </h3>
                
                {isLoadingUserIssues ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <motion.div 
                        key={i} 
                        className="bg-gray-100 rounded-xl p-4 animate-pulse"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </motion.div>
                    ))}
                  </div>
                ) : userIssues.length > 0 ? (
                  <div className="space-y-3" data-testid="user-recent-reports">
                    {userIssues.slice(0, 3).map((issue: IssueWithDetails, index) => (
                      <motion.div 
                        key={issue.id} 
                        className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all duration-300"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                        whileHover={{ x: 5, scale: 1.02 }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-medium text-sm line-clamp-1 text-gray-800" data-testid={`text-recent-title-${issue.id}`}>
                            {issue.title}
                          </span>
                          <StatusBadge status={issue.status} />
                        </div>
                        <p className="text-xs text-gray-600 mb-3" data-testid={`text-recent-date-${issue.id}`}>
                          Reported {new Date(issue.createdAt).toLocaleDateString()}
                        </p>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs bg-white hover:bg-gray-50 border-gray-300"
                            onClick={() => handleTrackStatus(issue)}
                            data-testid={`button-track-status-${issue.id}`}
                          >
                            Track Status
                          </Button>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div 
                    className="text-center py-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Plus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    </motion.div>
                    <p className="text-gray-600 text-sm mb-3">No reports yet</p>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white hover:bg-gray-50 border-gray-300"
                        onClick={() => setShowReportForm(true)}
                        data-testid="button-create-first-report"
                      >
                        Create your first report
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* PWA Install Banner */}
        <motion.div 
          className="mt-6 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-4 shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          whileHover={{ scale: 1.02, y: -2 }}
        >
          <div className="flex items-center space-x-3">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <Download className="text-blue-600 text-xl" />
            </motion.div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-800">Install CrowdCare</h4>
              <p className="text-sm text-blue-600">Get instant access from your home screen</p>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                size="sm" 
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-install-pwa"
              >
                Install
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Community Activity Feed */}
      <motion.div 
        className="space-y-6"
        variants={itemVariants}
      >
        <motion.div
          variants={cardVariants}
          whileHover="hover"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-xl font-semibold text-gray-800">Community Activity</span>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Badge variant="secondary" data-testid="badge-activity-count" className="bg-gradient-to-r from-blue-100 to-green-100 text-blue-800 border-blue-200">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {nearbyIssues.length} nearby issues
                  </Badge>
                </motion.div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingNearby ? (
                [...Array(3)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    className="animate-pulse"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="h-24 bg-gray-200 rounded-xl"></div>
                  </motion.div>
                ))
              ) : nearbyIssues.length > 0 ? (
                nearbyIssues.slice(0, 5).map((issue: IssueWithDetails, index) => (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                    whileHover={{ x: 5, scale: 1.01 }}
                  >
                    <IssueCard
                      issue={issue}
                      onUpvote={handleUpvoteIssue}
                      compact
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  className="text-center py-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  </motion.div>
                  <p className="text-gray-600 font-medium mb-2">No issues in your area</p>
                  <p className="text-sm text-gray-500">Be the first to report something!</p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
