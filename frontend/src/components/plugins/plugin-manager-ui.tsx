"use client";

/**
 * Plugin Manager UI Component
 * Provides interface for installing, managing, and configuring plugins
 */

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package2,
  Download,
  Settings,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  Upload,
  ExternalLink,
  Shield,
  Clock,
  User,
} from "lucide-react";
import { pluginManager } from "@/lib/plugins/plugin-manager";
import { createClient } from "@/lib/supabase/client";
import type { PluginRecord, PluginStatus } from "@/types/plugin.types";
import { toast } from "sonner";

export function PluginManagerUI() {
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("installed");
  const [installUrl, setInstallUrl] = useState("");
  const [isInstalling, setIsInstalling] = useState(false);
  const supabase = createClient();

  // Load plugins on mount
  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("plugins")
        .select("*")
        .order("name");

      if (error) throw error;
      setPlugins((data as PluginRecord[]) || []);
    } catch (error) {
      toast.error("Failed to load plugins");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallPlugin = async () => {
    if (!installUrl) return;

    setIsInstalling(true);
    try {
      const record = await pluginManager.installPlugin(installUrl);
      toast.success(
        `Plugin "${record.manifest.metadata.name}" installed successfully`,
      );
      setInstallUrl("");
      await loadPlugins();
    } catch (error: any) {
      toast.error(error.message || "Installation failed");
    } finally {
      setIsInstalling(false);
    }
  };

  const handleTogglePlugin = async (plugin: PluginRecord) => {
    try {
      if (plugin.status === "enabled") {
        await pluginManager.disablePlugin(plugin.id);
        toast.success(`${plugin.manifest.metadata.name} has been disabled`);
      } else {
        await pluginManager.enablePlugin(plugin.id);
        toast.success(`${plugin.manifest.metadata.name} has been enabled`);
      }
      await loadPlugins();
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle plugin");
    }
  };

  const handleUninstallPlugin = async (plugin: PluginRecord) => {
    try {
      await pluginManager.uninstallPlugin(plugin.id);
      toast.success(`${plugin.manifest.metadata.name} has been uninstalled`);
      await loadPlugins();
    } catch (error: any) {
      toast.error(error.message || "Failed to uninstall plugin");
    }
  };

  const getStatusIcon = (status: PluginStatus) => {
    switch (status) {
      case "enabled":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "disabled":
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "updating":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return <Package2 className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: PluginStatus) => {
    const variants: Record<
      PluginStatus,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      enabled: "default",
      disabled: "secondary",
      error: "destructive",
      installed: "outline",
      updating: "outline",
    };

    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const filteredPlugins = plugins.filter((plugin) => {
    const matchesSearch =
      plugin.manifest.metadata.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      plugin.manifest.metadata.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    if (selectedTab === "all") return matchesSearch;
    if (selectedTab === "installed") return matchesSearch;
    if (selectedTab === "enabled")
      return matchesSearch && plugin.status === "enabled";
    if (selectedTab === "disabled")
      return matchesSearch && plugin.status === "disabled";

    return false;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Plugin Manager</h2>
        <p className="text-muted-foreground">
          Install and manage plugins to extend your application
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="installed">Installed</TabsTrigger>
            <TabsTrigger value="enabled">Enabled</TabsTrigger>
            <TabsTrigger value="disabled">Disabled</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plugins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-64"
              />
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Download />
                  Install Plugin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Install Plugin</DialogTitle>
                  <DialogDescription>
                    Enter the URL of the plugin manifest to install
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="manifest-url">Manifest URL</Label>
                    <Input
                      id="manifest-url"
                      placeholder="https://example.com/plugin/manifest.json"
                      value={installUrl}
                      onChange={(e) => setInstallUrl(e.target.value)}
                    />
                  </div>
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Security Notice</AlertTitle>
                    <AlertDescription>
                      Only install plugins from trusted sources. Plugins have
                      access to your data and can modify the application.
                    </AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleInstallPlugin}
                    disabled={!installUrl || isInstalling}
                  >
                    {isInstalling && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Install Plugin
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value={selectedTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredPlugins.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No plugins found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Install your first plugin to get started"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPlugins.map((plugin) => (
                <Card key={plugin.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(plugin.status)}
                          <CardTitle className="text-xl">
                            {plugin.manifest.metadata.name}
                          </CardTitle>
                          <span className="text-sm text-muted-foreground">
                            v{plugin.manifest.metadata.version}
                          </span>
                          {getStatusBadge(plugin.status)}
                        </div>
                        <CardDescription>
                          {plugin.manifest.metadata.description}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={plugin.status === "enabled"}
                          disabled={
                            plugin.status === "error" ||
                            plugin.status === "updating"
                          }
                          onCheckedChange={() => handleTogglePlugin(plugin)}
                        />

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <PluginSettings plugin={plugin} />
                            {plugin.manifest.metadata.homepage && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={plugin.manifest.metadata.homepage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center"
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View Homepage
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleUninstallPlugin(plugin)}
                            >
                              Uninstall
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {plugin.manifest.metadata.author.name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Installed{" "}
                        {new Date(plugin.installedAt).toLocaleDateString()}
                      </div>
                      {plugin.manifest.metadata.keywords?.length && (
                        <div className="flex items-center gap-2">
                          {plugin.manifest.metadata.keywords.map((keyword) => (
                            <Badge
                              key={keyword}
                              variant="outline"
                              className="text-xs"
                            >
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {plugin.errorMessage && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Plugin Error</AlertTitle>
                        <AlertDescription>
                          {plugin.errorMessage}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PluginSettings({ plugin }: { plugin: PluginRecord }) {
  const hasSettings =
    plugin.manifest.metadata.requiredPermissions?.includes("access:storage");

  if (!hasSettings) {
    return (
      <DropdownMenuItem disabled>
        <Settings className="mr-2 h-4 w-4" />
        No Settings Available
      </DropdownMenuItem>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plugin.manifest.metadata.name} Settings</DialogTitle>
          <DialogDescription>
            Configure plugin settings and permissions
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {/* Plugin settings would be rendered here */}
          <p className="text-sm text-muted-foreground">
            Plugin settings interface would be loaded here based on the plugin's
            configuration component.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
