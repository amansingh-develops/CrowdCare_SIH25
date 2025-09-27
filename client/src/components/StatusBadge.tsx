import { cn } from "@/lib/utils";
import { ISSUE_STATUSES, ISSUE_PRIORITIES } from "@/types";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface StatusBadgeProps {
  status?: string;
  priority?: string;
  className?: string;
}

export function StatusBadge({ status, priority, className }: StatusBadgeProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const badgeVariants = {
    hidden: { opacity: 0, scale: 0.8, y: -5 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  if (status) {
    const statusConfig = ISSUE_STATUSES.find(s => s.value === status);
    if (!statusConfig) return null;

    return (
      <motion.span 
        className={cn(
          "status-badge inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm",
          statusConfig.color,
          className
        )} 
        data-testid={`status-badge-${status}`}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
        whileHover="hover"
        variants={badgeVariants}
      >
        {statusConfig.label}
      </motion.span>
    );
  }

  if (priority) {
    const priorityConfig = ISSUE_PRIORITIES.find(p => p.value === priority);
    if (!priorityConfig) return null;

    return (
      <motion.span 
        className={cn(
          "status-badge inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm",
          priorityConfig.color,
          className
        )} 
        data-testid={`priority-badge-${priority}`}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
        whileHover="hover"
        variants={badgeVariants}
      >
        {priorityConfig.label}
      </motion.span>
    );
  }

  return null;
}
