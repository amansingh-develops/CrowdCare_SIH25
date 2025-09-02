import { cn } from "@/lib/utils";
import { ISSUE_STATUSES, ISSUE_PRIORITIES } from "@/types";

interface StatusBadgeProps {
  status?: string;
  priority?: string;
  className?: string;
}

export function StatusBadge({ status, priority, className }: StatusBadgeProps) {
  if (status) {
    const statusConfig = ISSUE_STATUSES.find(s => s.value === status);
    if (!statusConfig) return null;

    return (
      <span className={cn(
        "status-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        statusConfig.color,
        className
      )} data-testid={`status-badge-${status}`}>
        {statusConfig.label}
      </span>
    );
  }

  if (priority) {
    const priorityConfig = ISSUE_PRIORITIES.find(p => p.value === priority);
    if (!priorityConfig) return null;

    return (
      <span className={cn(
        "status-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        priorityConfig.color,
        className
      )} data-testid={`priority-badge-${priority}`}>
        {priorityConfig.label}
      </span>
    );
  }

  return null;
}
