import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { ArrowBigUp, MessageCircle, MapPin, Calendar, User, Eye } from "lucide-react";
import { formatISTDateTime } from "@/lib/utils";
import type { IssueWithDetails } from "@shared/schema";
import { ISSUE_CATEGORIES } from "@/types";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface IssueCardProps {
  issue: IssueWithDetails;
  onUpvote?: (issueId: string) => void;
  onView?: (issueId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function IssueCard({ issue, onUpvote, onView, showActions = true, compact = false }: IssueCardProps) {
  const categoryLabel = ISSUE_CATEGORIES.find(c => c.value === issue.category)?.label || issue.category;
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpvote?.(issue.id);
  };

  const handleView = () => {
    onView?.(issue.id);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    hover: {
      y: -5,
      scale: 1.02,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      whileHover="hover"
      variants={cardVariants}
    >
      <Card 
        className="bg-white border border-gray-200 hover:border-blue-300 hover:shadow-xl cursor-pointer transition-all duration-300 overflow-hidden"
        onClick={handleView}
        data-testid={`card-issue-${issue.id}`}
      >
        <CardContent className={compact ? "p-4" : "p-6"}>
          <motion.div 
            className="flex items-start justify-between mb-4"
            variants={itemVariants}
          >
            <div className="flex-1">
              <motion.h3 
                className="font-bold text-gray-800 mb-2 line-clamp-1 text-lg" 
                data-testid={`text-issue-title-${issue.id}`}
                whileHover={{ color: "#2563eb" }}
                transition={{ duration: 0.2 }}
              >
                {issue.title}
              </motion.h3>
              <motion.p 
                className="text-sm text-gray-600 line-clamp-2 leading-relaxed" 
                data-testid={`text-issue-description-${issue.id}`}
              >
                {issue.description}
              </motion.p>
            </div>
            <motion.div 
              className="flex items-center space-x-2 ml-4"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <StatusBadge status={issue.status} />
              <StatusBadge priority={issue.priority} />
            </motion.div>
          </motion.div>

          {/* Issue Image */}
          {issue.images && issue.images.length > 0 && (
            <motion.div 
              className="mb-4"
              variants={itemVariants}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden rounded-lg"
              >
                <img
                  src={`/uploads/${issue.images[0].filePath}`}
                  alt="Issue evidence"
                  className="w-full h-32 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  data-testid={`img-issue-evidence-${issue.id}`}
                />
              </motion.div>
            </motion.div>
          )}

          {/* Metadata */}
          <motion.div 
            className="flex flex-wrap items-center text-xs text-gray-500 space-x-4 mb-4"
            variants={itemVariants}
          >
            <motion.div 
              className="flex items-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <MapPin className="w-3 h-3 mr-1 text-blue-500" />
              <span className="truncate max-w-32" data-testid={`text-issue-location-${issue.id}`}>
                {issue.location}
              </span>
            </motion.div>
            <motion.div 
              className="flex items-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <Calendar className="w-3 h-3 mr-1 text-green-500" />
              <span data-testid={`text-issue-date-${issue.id}`}>{formatISTDateTime(issue.createdAt)}</span>
            </motion.div>
            <motion.div 
              className="flex items-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <User className="w-3 h-3 mr-1 text-purple-500" />
              <span data-testid={`text-issue-reporter-${issue.id}`}>
                {issue.reportedBy.firstName || 'Anonymous'}
              </span>
            </motion.div>
          </motion.div>

          {/* Category Badge */}
          <motion.div 
            className="mb-4"
            variants={itemVariants}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <Badge 
                variant="secondary" 
                className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors" 
                data-testid={`badge-category-${issue.id}`}
              >
                {categoryLabel}
              </Badge>
            </motion.div>
          </motion.div>

          {/* Actions */}
          {showActions && (
            <motion.div 
              className="flex items-center justify-between pt-4 border-t border-gray-200"
              variants={itemVariants}
            >
              <div className="flex items-center space-x-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUpvote}
                    className={`flex items-center space-x-1 transition-all ${issue.userHasUpvoted ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`}
                    data-testid={`button-upvote-${issue.id}`}
                    aria-pressed={issue.userHasUpvoted}
                  >
                    <ArrowBigUp className={`w-4 h-4 ${issue.userHasUpvoted ? 'fill-blue-600 stroke-blue-600' : ''}`} />
                    <span className="font-medium">{issue.upvotes || 0}</span>
                  </Button>
                </motion.div>
                <motion.div 
                  className="flex items-center space-x-1 text-gray-600"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm font-medium" data-testid={`text-comment-count-${issue.id}`}>
                    {issue.comments?.length || 0}
                  </span>
                </motion.div>
              </div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleView}
                  data-testid={`button-view-details-${issue.id}`}
                  className="bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-300 text-blue-600 hover:text-blue-700"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
              </motion.div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
