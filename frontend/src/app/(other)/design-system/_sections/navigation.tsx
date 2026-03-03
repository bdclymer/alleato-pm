"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function NavigationSection() {
  return (
    <section id="navigation" className="scroll-mt-8">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Navigation
      </h2>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        Tabs, breadcrumbs, and navigation patterns used across the app.
      </p>

      {/* Tabs */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Tabs
        </h3>
        <div className="rounded-lg border border-border bg-card p-6">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Overview tab content. Tabs are used for switching between
                related views within the same page context.
              </p>
            </TabsContent>
            <TabsContent value="details" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Details tab content with additional information.
              </p>
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <p className="text-sm text-muted-foreground">
                History tab content showing past changes.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div>
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Breadcrumbs
        </h3>
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Projects</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Westfield Collective</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Budget</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Directory</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Companies</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Acme Construction</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>
    </section>
  );
}
