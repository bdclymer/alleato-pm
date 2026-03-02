"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
} from "lucide-react";
interface Initiative {
  id: string;
  name: string;
  owner: string;
  status: "planning" | "in-progress" | "verification" | "completed" | "blocked";
  priority: "high" | "medium" | "low";
  progress: number;
  verification: "pending" | "verified" | "failed";
  lastUpdate: string;
  tasks: Array<{
    id: string;
    content: string;
    status: "pending" | "in-progress" | "completed";
    priority: "high" | "medium" | "low";
  }>;
}
interface MonitoringChartsProps {
  initiatives: Initiative[];
}
export function MonitoringCharts({ initiatives }: MonitoringChartsProps) {
  const getStatusDistribution = () => {
    const distribution = initiatives.reduce(
      (acc, init) => {
        acc[init.status] = (acc[init.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    return Object.entries(distribution).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / initiatives.length) * 100),
    }));
  };
  const getPriorityDistribution = () => {
    const distribution = initiatives.reduce(
      (acc, init) => {
        acc[init.priority] = (acc[init.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    return Object.entries(distribution).map(([priority, count]) => ({
      priority,
      count,
      percentage: Math.round((count / initiatives.length) * 100),
    }));
  };
  const getVerificationDistribution = () => {
    const distribution = initiatives.reduce(
      (acc, init) => {
        acc[init.verification] = (acc[init.verification] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    return Object.entries(distribution).map(([verification, count]) => ({
      verification,
      count,
      percentage: Math.round((count / initiatives.length) * 100),
    }));
  };
  const getProgressTrend = () => {
    // Simple progress analysis
    const totalProgress = initiatives.reduce(
      (sum, init) => sum + init.progress,
      0,
    );
    const avgProgress = Math.round(totalProgress / initiatives.length);
    const completedToday = initiatives.filter(
      (init) =>
        init.status === "completed" &&
        new Date(init.lastUpdate).toDateString() === new Date().toDateString(),
    ).length;
    const stalled = initiatives.filter(
      (init) =>
        init.status === "in-progress" &&
        new Date(init.lastUpdate) < new Date(Date.now() - 24 * 60 * 60 * 1000),
    ).length;
    return { avgProgress, completedToday, stalled };
  };
  const statusDistribution = getStatusDistribution();
  const priorityDistribution = getPriorityDistribution();
  const verificationDistribution = getVerificationDistribution();
  const progressTrend = getProgressTrend();
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in-progress":
        return "bg-blue-500";
      case "blocked":
        return "bg-red-500";
      case "verification":
        return "bg-yellow-500";
      default:
        return "bg-muted0";
    }
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-muted text-foreground border-border";
    }
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {" "}
      {/* Status Distribution */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="flex items-center gap-2 text-lg">
            {" "}
            <BarChart3 className="w-5 h-5" /> Status Distribution{" "}
          </CardTitle>{" "}
        </CardHeader>
        <CardContent>
          {" "}
          <div className="space-y-4">
            {" "}
            {statusDistribution.map(({ status, count, percentage }) => (
              <div key={status} className="flex items-center justify-between">
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}
                  />{" "}
                  <span className="text-sm font-medium capitalize">
                    {status}
                  </span>{" "}
                </div>
                <div className="flex items-center gap-2">
                  {" "}
                  <span className="text-sm text-muted-foreground">{count}</span>
                  <div className="w-16 bg-muted rounded-full h-2">
                    {" "}
                    <div
                      className={`h-2 rounded-full ${getStatusColor(status)}`}
                      style={{ width: `${percentage}%` }}
                    />{" "}
                  </div>
                  <span className="text-xs text-muted-foreground w-8">
                    {percentage}%
                  </span>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
      {/* Priority Distribution */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="flex items-center gap-2 text-lg">
            {" "}
            <Activity className="w-5 h-5" /> Priority Breakdown{" "}
          </CardTitle>{" "}
        </CardHeader>
        <CardContent>
          {" "}
          <div className="space-y-4">
            {" "}
            {priorityDistribution.map(({ priority, count, percentage }) => (
              <div key={priority} className="flex items-center justify-between">
                {" "}
                <Badge variant="outline" className={getPriorityColor(priority)}>
                  {" "}
                  {priority}{" "}
                </Badge>
                <div className="flex items-center gap-2">
                  {" "}
                  <span className="text-sm text-muted-foreground">
                    {count} initiatives
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({percentage}%)
                  </span>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
      {/* Progress Trends */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="flex items-center gap-2 text-lg">
            {" "}
            <TrendingUp className="w-5 h-5" /> Progress Insights{" "}
          </CardTitle>{" "}
        </CardHeader>
        <CardContent>
          {" "}
          <div className="space-y-4">
            {" "}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              {" "}
              <div>
                {" "}
                <p className="text-sm font-medium">Average Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {progressTrend.avgProgress}%
                </p>{" "}
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />{" "}
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              {" "}
              <div>
                {" "}
                <p className="text-sm font-medium">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {progressTrend.completedToday}
                </p>{" "}
              </div>
              <Badge className="bg-green-500">
                {" "}
                +{progressTrend.completedToday}{" "}
              </Badge>{" "}
            </div>
            {progressTrend.stalled > 0 && (
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                {" "}
                <div>
                  {" "}
                  <p className="text-sm font-medium">Stalled (24h+)</p>
                  <p className="text-2xl font-bold text-red-600">
                    {progressTrend.stalled}
                  </p>{" "}
                </div>
                <Clock className="w-8 h-8 text-red-500" />{" "}
              </div>
            )}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
      {/* Verification Status */}{" "}
      <Card className="lg:col-span-2 xl:col-span-3">
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="flex items-center gap-2 text-lg">
            {" "}
            <Activity className="w-5 h-5" /> Verification Pipeline{" "}
          </CardTitle>{" "}
        </CardHeader>
        <CardContent>
          {" "}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {" "}
            {verificationDistribution.map(
              ({ verification, count, percentage }) => {
                const getVerificationIcon = () => {
                  switch (verification) {
                    case "verified":
                      return <TrendingUp className="w-5 h-5 text-green-500" />;
                    case "failed":
                      return <TrendingDown className="w-5 h-5 text-red-500" />;
                    default:
                      return <Clock className="w-5 h-5 text-yellow-500" />;
                  }
                };
                const getVerificationColor = () => {
                  switch (verification) {
                    case "verified":
                      return "border-green-200 bg-green-50";
                    case "failed":
                      return "border-red-200 bg-red-50";
                    default:
                      return "border-yellow-200 bg-yellow-50";
                  }
                };
                return (
                  <div
                    key={verification}
                    className={`border rounded-lg p-4 ${getVerificationColor()}`}
                  >
                    {" "}
                    <div className="flex items-center gap-2 mb-2">
                      {" "}
                      {getVerificationIcon()}{" "}
                      <span className="font-medium capitalize">
                        {verification}
                      </span>{" "}
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-foreground">
                      {percentage}% of total
                    </div>
                    <div className="mt-2 w-full bg-muted rounded-full h-2">
                      {" "}
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${verification === "verified" ? "bg-green-500" : verification === "failed" ? "bg-red-500" : "bg-yellow-500"}`}
                        style={{ width: `${percentage}%` }}
                      />{" "}
                    </div>{" "}
                  </div>
                );
              },
            )}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
