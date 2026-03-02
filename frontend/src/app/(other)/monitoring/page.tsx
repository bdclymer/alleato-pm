'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout';
import { DashboardLayout } from '@/components/layouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChevronDown,
  ChevronRight,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectTitle } from '@/hooks/useProjectTitle';

interface Project {
  id: string;
  name: string;
  taskFile: string;
}

interface ParsedTask {
  text: string;
  completed: boolean;
}

interface ParsedSection {
  title: string;
  tasks: ParsedTask[];
}

export default function MonitoringPage() {
  useProjectTitle('Monitoring', false);

  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [projectContent, setProjectContent] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const projects: Project[] = [
    {
      id: 'change-events',
      name: 'Change Events',
      taskFile: '/documentation/active-task-lists/TASKS-CHANGE-EVENTS.md'
    },
    {
      id: 'direct-costs',
      name: 'Direct Costs',
      taskFile: '/documentation/active-task-lists/TASKS-DIRECT-COSTS.md'
    },
    {
      id: 'form-testing',
      name: 'Form Testing',
      taskFile: '/documentation/active-task-lists/TASKS-FORM-TESTING.md'
    },
    {
      id: 'directory-tool',
      name: 'Directory Tool',
      taskFile: '/documentation/active-task-lists/TASKS-DIRECTORY-TOOL.md'
    }
  ];

  const fetchTaskContent = async (project: Project) => {
    // Skip if already loaded
    if (projectContent[project.id]) {
      return;
    }

    setIsLoading(prev => ({ ...prev, [project.id]: true }));
    setErrors(prev => ({ ...prev, [project.id]: '' }));

    try {
      const response = await fetch(
        `/api/files/read?path=${encodeURIComponent(project.taskFile)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const content = await response.text();
      setProjectContent(prev => ({ ...prev, [project.id]: content }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrors(prev => ({
        ...prev,
        [project.id]: `Failed to load task file: ${errorMessage}`
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, [project.id]: false }));
    }
  };

  const toggleProject = async (project: Project) => {
    if (expandedProject === project.id) {
      setExpandedProject(null);
    } else {
      setExpandedProject(project.id);
      await fetchTaskContent(project);
    }
  };

  const parseTasksContent = (content: string): ParsedSection[] => {
    const lines = content.split('\n');
    const sections: ParsedSection[] = [];
    let currentSection: ParsedSection | null = null;

    const cleanTitle = (title: string): string => {
      return title
        .replace(/^#+\s*/, '') // Remove markdown headers
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
        .replace(/^[🔴🟡🟢🔵🟣✅📋🚧]/g, '') // Remove status emojis
        .replace(/Phase \d+:\s*/i, '') // Remove phase indicators
        .replace(/\(Priority:.*?\)/i, '') // Remove priority tags
        .replace(/✅.*$/i, '') // Remove checkmarks
        .replace(/⚠️.*$/i, '') // Remove warnings
        .trim();
    };

    const shouldSkipSection = (title: string): boolean => {
      const skipPatterns = [
        'Project Summary',
        'Key Files',
        'Success Criteria',
        'Known Issues',
        'Questions',
        'Summary',
        'Deliverables',
        'IMPLEMENTATION'
      ];
      return skipPatterns.some(pattern => title.includes(pattern));
    };

    const addCurrentSection = () => {
      if (currentSection && currentSection.tasks.length > 0) {
        sections.push(currentSection);
      }
    };

    for (const line of lines) {
      // Check for section headers
      if ((line.startsWith('### ') || line.startsWith('## ')) &&
          !line.includes('Progress') &&
          !line.includes('Notes')) {

        const cleanedTitle = cleanTitle(line);

        if (cleanedTitle && !shouldSkipSection(cleanedTitle)) {
          addCurrentSection();
          currentSection = { title: cleanedTitle, tasks: [] };
        }
      }
      // Check for task items
      else if (line.includes('- [ ]') || line.includes('- [x]')) {
        const isCompleted = line.includes('- [x]');
        const taskText = line
          .replace(/^-\s*\[[x\s]\]\s*/, '')
          .replace(/✅.*$/i, '')
          .replace(/⚠️.*$/i, '')
          .trim();

        if (taskText) {
          // Create default section if needed
          if (!currentSection) {
            currentSection = { title: 'Tasks', tasks: [] };
          }

          currentSection.tasks.push({
            text: taskText,
            completed: isCompleted
          });
        }
      }
    }

    // Add final section
    addCurrentSection();

    return sections;
  };

  const calculateProjectStats = (content: string) => {
    const sections = parseTasksContent(content);
    const allTasks = sections.flatMap(s => s.tasks);
    const completed = allTasks.filter(t => t.completed).length;
    const total = allTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  };

  const getStatusColor = (percentage: number) => {
    if (percentage === 100) return 'text-success';
    if (percentage >= 70) return 'text-info';
    if (percentage >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage === 100) return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (percentage >= 70) return <Activity className="w-4 h-4 text-info" />;
    if (percentage >= 40) return <Clock className="w-4 h-4 text-warning" />;
    return <AlertCircle className="w-4 h-4 text-destructive" />;
  };

  return (
    <>
      <PageHeader
        title="Project Tasks"
        description="Track progress across all active projects"
        breadcrumbs={[
          { label: 'Monitoring' }
        ]}
      />

      <DashboardLayout>
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {projects.map(project => {
              const content = projectContent[project.id];
              const stats = content ? calculateProjectStats(content) : null;

              return (
                <Card key={`summary-${project.id}`}>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      {project.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-2xl font-bold",
                            getStatusColor(stats.percentage)
                          )}>
                            {stats.percentage}%
                          </span>
                          {getStatusIcon(stats.percentage)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {stats.completed} of {stats.total} tasks completed
                        </div>
                        {/* Progress bar - inline style acceptable for dynamic percentage data */}
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-all duration-300",
                              stats.percentage === 100 ? "bg-success" :
                              stats.percentage >= 70 ? "bg-info" :
                              stats.percentage >= 40 ? "bg-warning" :
                              "bg-destructive"
                            )}
                            style={{ width: `${stats.percentage}%` }}
                            role="progressbar"
                            aria-valuenow={stats.percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${stats.percentage}% complete`}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Click to load tasks
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Expandable Task Lists */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Detailed Task Tracking
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Refresh all expanded projects
                    if (expandedProject) {
                      const project = projects.find(p => p.id === expandedProject);
                      if (project) {
                        setProjectContent(prev => {
                          const newContent = { ...prev };
                          delete newContent[project.id];
                          return newContent;
                        });
                        fetchTaskContent(project);
                      }
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {projects.map((project) => {
                  const isExpanded = expandedProject === project.id;
                  const content = projectContent[project.id];
                  const isProjectLoading = isLoading[project.id];
                  const error = errors[project.id];
                  const sections = content ? parseTasksContent(content) : [];

                  return (
                    <div key={project.id}>
                      {/* Project Header */}
                      <button
                        className="w-full px-6 py-4 flex items-center gap-4 hover:bg-muted transition-colors text-left"
                        onClick={() => toggleProject(project)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="font-medium text-foreground">
                          {project.name}
                        </span>
                        {content && (
                          <Badge variant="outline" className="ml-auto">
                            {calculateProjectStats(content).percentage}% complete
                          </Badge>
                        )}
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-6 pb-6 bg-muted">
                          {isProjectLoading && !content && (
                            <div className="space-y-4 py-4">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-4 w-5/6" />
                            </div>
                          )}

                          {error && (
                            <Alert variant="destructive" className="my-4">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          )}

                          {sections.length > 0 && (
                            <div className="space-y-6 py-4 max-h-[600px] overflow-y-auto">
                              {sections.map((section, sectionIdx) => (
                                <div key={`${project.id}-section-${sectionIdx}`}>
                                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                                    {section.title}
                                  </h4>
                                  <div className="space-y-2 bg-background rounded-lg p-4">
                                    {section.tasks.map((task, taskIdx) => (
                                      <label
                                        key={`${project.id}-task-${sectionIdx}-${taskIdx}`}
                                        className="flex items-start gap-4 py-1.5 cursor-default group"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={task.completed}
                                          disabled
                                          className="mt-0.5 h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className={cn(
                                          "text-sm leading-relaxed flex-1",
                                          task.completed
                                            ? "line-through text-muted-foreground"
                                            : "text-foreground"
                                        )}>
                                          {task.text}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!isProjectLoading && !error && sections.length === 0 && (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                              No tasks found in this project
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </>
  );
}
