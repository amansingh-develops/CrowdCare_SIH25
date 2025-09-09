import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Filter, Search, Layers } from "lucide-react";
import type { IssueWithDetails } from "@shared/schema";
import { ISSUE_CATEGORIES, ISSUE_STATUSES, ISSUE_PRIORITIES } from "@/types";

interface IssuesMapProps {
  issues: IssueWithDetails[];
  onIssueSelect?: (issue: IssueWithDetails) => void;
  className?: string;
}

export function IssuesMap({ issues, onIssueSelect, className }: IssuesMapProps) {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IssueWithDetails | null>(null);

  // Filter issues based on selected filters
  const filteredIssues = issues.filter(issue => {
    if (selectedFilters.length === 0) return true;
    return selectedFilters.includes(issue.status) || 
           selectedFilters.includes(issue.category) || 
           selectedFilters.includes(issue.priority || 'medium');
  });

  const getMarkerColor = (issue: IssueWithDetails) => {
    if (issue.priority === 'urgent' || issue.priority === 'high') return 'bg-red-500';
    if (issue.status === 'resolved') return 'bg-green-500';
    if (issue.status === 'in_progress') return 'bg-blue-500';
    return 'bg-orange-500';
  };

  const getMarkerSize = (issue: IssueWithDetails) => {
    return issue.priority === 'urgent' ? 'w-4 h-4' : 'w-3 h-3';
  };

  const handleIssueClick = (issue: IssueWithDetails) => {
    setSelectedIssue(issue);
    onIssueSelect?.(issue);
  };

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="border-b border-border">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <CardTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-primary" />
            Community Issues Map
          </CardTitle>
          <div className="flex items-stretch sm:items-center gap-2">
            <Button variant="outline" size="sm" className="w-full sm:w-auto" data-testid="button-map-filter">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" data-testid="button-map-search">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">View and support issues in your area</p>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Map Container */}
        <div className="h-[50vh] sm:h-96 bg-muted relative overflow-hidden" data-testid="map-container">
          {/* Mock city background */}
          <div 
            className="w-full h-full bg-cover bg-center relative"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1486325212027-8081e485255e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400')",
            }}
          >
            {/* Map overlay */}
            <div className="absolute inset-0 bg-black/20"></div>
            
            {/* Issue markers */}
            <div className="absolute inset-0">
              {filteredIssues.slice(0, 10).map((issue, index) => (
                <button
                  key={issue.id}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${getMarkerColor(issue)} ${getMarkerSize(issue)} rounded-full border-2 border-white shadow-lg hover:scale-125 transition-transform cursor-pointer z-10`}
                  style={{
                    left: `${20 + (index % 5) * 15}%`,
                    top: `${30 + Math.floor(index / 5) * 20}%`,
                  }}
                  onClick={() => handleIssueClick(issue)}
                  data-testid={`marker-issue-${issue.id}`}
                />
              ))}
            </div>

            {/* Selected issue popup */}
            {selectedIssue && (
              <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg p-4 max-w-sm shadow-lg border border-border">
                <h4 className="font-semibold mb-2" data-testid="text-selected-issue-title">
                  {selectedIssue.title}
                </h4>
                <p className="text-sm text-muted-foreground mb-2" data-testid="text-selected-issue-description">
                  {selectedIssue.description.slice(0, 100)}...
                </p>
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {ISSUE_CATEGORIES.find(c => c.value === selectedIssue.category)?.label}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${ISSUE_STATUSES.find(s => s.value === selectedIssue.status)?.color}`}
                  >
                    {ISSUE_STATUSES.find(s => s.value === selectedIssue.status)?.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  📍 {selectedIssue.location}
                </p>
              </div>
            )}

            {/* Map legend */}
            <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm rounded-lg p-4 max-w-xs">
              <h4 className="font-semibold mb-3 text-center">Legend</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>High Priority Issues</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Standard Issues</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Resolved Issues</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map controls */}
        <div className="p-4 bg-muted/30 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-border">
          <div className="flex items-center flex-wrap gap-2">
            {/* Quick filter buttons */}
            {['high', 'new', 'in_progress', 'resolved'].map((filter) => (
              <Button
                key={filter}
                variant={selectedFilters.includes(filter) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleFilter(filter)}
                className="text-xs"
                data-testid={`button-filter-${filter}`}
              >
                {filter.replace('_', ' ').toUpperCase()}
              </Button>
            ))}
          </div>
          <div className="text-sm text-muted-foreground" data-testid="text-issue-count">
            {filteredIssues.length} issues shown
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
