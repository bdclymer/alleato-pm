"use client"; /** * ============================================================================ * DEVELOPER TOOLS INDEX * ============================================================================ * * Central hub for development-only tools and utilities. * Only accessible in local/development environments. */
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table2, Code, Wrench, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DashboardLayout } from "@/components/layouts";
import { PageHeader } from "@/components/layout/page-header-unified";
const devTools = [
  {
    title: "Table Page Generator",
    description:
      "Generate complete table page configurations from Supabase tables in seconds",
    icon: Table2,
    href: "/dev/table-generator",
    tags: ["Supabase", "UI", "Generator"],
  }, // Add more dev tools here as they are created
];
export default function DevToolsPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="container mx-auto py-12">
        {" "}
        <Alert variant="destructive">
          {" "}
          <AlertCircle className="h-4 w-4" />{" "}
          <AlertTitle>Not Available</AlertTitle>
          <AlertDescription>
            {" "}
            Developer tools are only available in development environments.{" "}
          </AlertDescription>{" "}
        </Alert>{" "}
      </div>
    );
  }
  return (
    <>
      {" "}
      <PageHeader
        title="Developer Tools"
        description="Internal development utilities and code generators"
        breadcrumbs={[{ label: "Dev" }]}
      />{" "}
      <DashboardLayout>
        {" "}
        {/* Environment Badge */}{" "}
        <Alert>
          {" "}
          <Code className="h-4 w-4" />{" "}
          <AlertTitle>Development Environment</AlertTitle>
          <AlertDescription>
            {" "}
            These tools are only accessible in local development. They are
            automatically blocked in production.{" "}
          </AlertDescription>{" "}
        </Alert>
        {/* Tools Grid */}{" "}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {" "}
          {devTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card
                key={tool.href}
                className="hover:shadow-lg transition-shadow"
              >
                {" "}
                <CardHeader>
                  {" "}
                  <div className="flex items-start justify-between">
                    {" "}
                    <div className="space-y-2">
                      {" "}
                      <CardTitle className="flex items-center gap-2">
                        {" "}
                        <Icon className="h-5 w-5" /> {tool.title}{" "}
                      </CardTitle>
                      <CardDescription>{tool.description}</CardDescription>{" "}
                    </div>{" "}
                  </div>{" "}
                </CardHeader>
                <CardContent className="space-y-4">
                  {" "}
                  <div className="flex flex-wrap gap-2">
                    {" "}
                    {tool.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                      >
                        {" "}
                        {tag}{" "}
                      </span>
                    ))}{" "}
                  </div>
                  <Link href={tool.href}>
                    {" "}
                    <Button className="w-full"> Open Tool </Button>{" "}
                  </Link>{" "}
                </CardContent>{" "}
              </Card>
            );
          })}{" "}
        </div>
        {/* Future Tools Placeholder */}{" "}
        <Card className="border-dashed mt-8">
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="text-muted-foreground">
              More tools coming soon...
            </CardTitle>
            <CardDescription>
              {" "}
              Additional development utilities and code generators will be added
              here as needed.{" "}
            </CardDescription>{" "}
          </CardHeader>{" "}
        </Card>
        {/* Quick Links */}{" "}
        <div className="mt-12 pt-8 border-t">
          {" "}
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {" "}
            <Link href="/api/health" target="_blank">
              {" "}
              <Button variant="outline" className="w-full">
                {" "}
                API Health Check{" "}
              </Button>{" "}
            </Link>
            <Link href="https://supabase.com/dashboard" target="_blank">
              {" "}
              <Button variant="outline" className="w-full">
                {" "}
                Supabase Dashboard{" "}
              </Button>{" "}
            </Link>
            <Link
              href="https://github.com/anthropics/claude-code"
              target="_blank"
            >
              {" "}
              <Button variant="outline" className="w-full">
                {" "}
                Claude Code Docs{" "}
              </Button>{" "}
            </Link>
            <Link href="/dev/table-generator" target="_blank">
              {" "}
              <Button variant="outline" className="w-full">
                {" "}
                Table Generator{" "}
              </Button>{" "}
            </Link>{" "}
          </div>{" "}
        </div>{" "}
      </DashboardLayout>{" "}
    </>
  );
}
