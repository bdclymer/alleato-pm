"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import SupabaseAuthManager from "./auth";
import SupabaseDatabaseManager from "./database";

export function SupabaseManager() {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Internal tooling</p>
          <h1 className="text-3xl font-semibold">Supabase Manager</h1>
          <p className="text-muted-foreground">
            Prototype console for reviewing authentication, database health, and
            cluster automation.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Badge variant="outline" className="border-dashed">
            Environment: production
          </Badge>
          <Button variant="outline" size="sm">
            View Supabase docs
          </Button>
          <Button size="sm">Open Supabase console</Button>
        </div>
      </div>

      <Tabs defaultValue="auth" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="auth" className="space-y-6">
          <SupabaseAuthManager />
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <SupabaseDatabaseManager />
        </TabsContent>
      </Tabs>
    </section>
  );
}

export default SupabaseManager;
