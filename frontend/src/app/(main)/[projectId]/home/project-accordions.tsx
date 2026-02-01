"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface ScheduleItem {
  id: string | number;
  task?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

interface InsightItem {
  id: string | number;
  category?: string;
  priority?: string;
  insight_text?: string;
  content?: string;
  created_at?: string;
}

interface ProjectAccordionsProps {
  projectId: string;
  schedule?: ScheduleItem[];
  insights?: InsightItem[];
}

export function ProjectAccordions({
  projectId,
  schedule = [],
  insights = [],
}: ProjectAccordionsProps) {
  const getStatusIcon = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "approved":
      case "closed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "pending":
      case "in-progress":
      case "open":
        return <Clock className="h-4 w-4 text-warning" />;
      case "rejected":
      case "overdue":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="w-full space-y-8">
        {/* Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 5 * 0.1 }}
        >
          <AccordionItem
            value="schedule"
            className="bg-background border-b border-neutral-100"
          >
            <AccordionTrigger className="hover:no-underline py-4 px-0">
              <div className="flex items-center justify-between w-full mr-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand flex-shrink-0" />
                  <span className="text-sm font-medium text-neutral-900">
                    Schedule
                  </span>
                  <span className="text-sm font-medium tabular-nums text-neutral-400">
                    {schedule.length}
                  </span>
                </div>
                <Link
                  href={`/${projectId}/schedule`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  View Schedule <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                {schedule.length > 0 ? (
                  schedule.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between p-3 bg-muted/50"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{item.task}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.start_date &&
                            format(new Date(item.start_date), "MMM d")}{" "}
                          -
                          {item.end_date &&
                            format(new Date(item.end_date), "MMM d, yyyy")}
                        </p>
                      </div>
                      {getStatusIcon(item.status)}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground p-3">
                    No schedule items
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </motion.div>

        {/* Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 9 * 0.1 }}
        >
          <AccordionItem
            value="insights"
            className="bg-background border-b border-neutral-100"
          >
            <AccordionTrigger className="hover:no-underline py-4 px-0">
              <div className="flex items-center justify-between w-full mr-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-brand flex-shrink-0" />
                  <span className="text-sm font-medium text-neutral-900">
                    AI Insights
                  </span>
                  <span className="text-sm font-medium tabular-nums text-neutral-400">
                    {insights.length}
                  </span>
                </div>
                <Link
                  href={`/${projectId}/insights`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  View All <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                {insights.length > 0 ? (
                  insights.slice(0, 5).map((insight) => (
                    <div key={insight.id} className="p-3 bg-muted/50">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium text-sm">
                          {insight.category || "General"}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {insight.priority || "Medium"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {insight.insight_text || insight.content}
                      </p>
                      {insight.created_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(insight.created_at), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground p-3">
                    No AI insights generated yet
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </motion.div>
      </Accordion>
    </div>
  );
}
