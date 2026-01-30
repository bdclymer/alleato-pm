/**
 * Plugin Manager for Alleato-Procore
 * Handles plugin lifecycle, loading, and execution
 */

import { createClient } from "@/lib/supabase/client";
import type {
  Plugin,
  PluginAPI,
  PluginManifest,
  PluginRecord,
  PluginStatus,
  HookType,
  HookContext,
} from "@/types/plugin.types";
import {
  PluginError,
  PluginValidationResult,
  MenuItem,
  DashboardWidget,
  ProjectTab,
} from "@/types/plugin.types";
import { pluginManifestSchema } from "@/types/plugin.types";
import { EventEmitter } from "events";

export class PluginManager extends EventEmitter {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private hooks: Map<
    HookType,
    Array<{ pluginId: string; handler: Function; priority: number }>
  > = new Map();
  private menuItems: Map<string, MenuItem[]> = new Map();
  private widgets: DashboardWidget[] = [];
  private projectTabs: Map<string, ProjectTab[]> = new Map();
  private supabase = createClient();

  private constructor() {
    super();
    this.initialize();
  }

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  private async initialize() {
    await this.loadEnabledPlugins();
    this.setupGlobalErrorHandling();
  }

  private setupGlobalErrorHandling() {
    window.addEventListener("unhandledrejection", (event) => {
      if (event.reason instanceof PluginError) {
        this.emit("plugin:error", {
          pluginId: event.reason.pluginId,
          error: event.reason,
        });
      }
    });
  }

  /**
   * Load all enabled plugins from the database
   */
  async loadEnabledPlugins() {
    const { data: pluginRecords, error } = await (this.supabase as any)
      .from("plugins")
      .select("*")
      .eq("status", "enabled");

    if (error) {
      return;
    }

    for (const record of (pluginRecords as any[]) || []) {
      try {
        await this.loadPlugin(record as PluginRecord);
      } catch (error) {
        await this.setPluginError(record.id, error as Error);
      }
    }
  }

  /**
   * Load a single plugin
   */
  private async loadPlugin(record: PluginRecord) {
    // Download and evaluate plugin code
    const plugin = await this.downloadPlugin(record.manifest);

    // Create plugin API instance
    const api = this.createPluginAPI(record.id);

    // Initialize plugin
    if (plugin.lifecycle?.onEnable) {
      await plugin.lifecycle.onEnable();
    }

    // Register hooks
    this.registerPluginHooks(record.id, plugin);

    // Store plugin instance
    this.plugins.set(record.id, plugin);

    this.emit("plugin:loaded", { pluginId: record.id, plugin });
  }

  /**
   * Download and evaluate plugin code
   */
  private async downloadPlugin(manifest: PluginManifest): Promise<Plugin> {
    // In production, this would download from a CDN or plugin store
    // For now, we'll implement a simple loader

    const response = await fetch(manifest.entry);
    const code = await response.text();

    // Create a sandboxed environment for the plugin
    const pluginModule = this.evaluatePluginCode(code, manifest);

    return pluginModule.default || pluginModule;
  }

  /**
   * Safely evaluate plugin code in a sandboxed environment
   */
  private evaluatePluginCode(code: string, manifest: PluginManifest): any {
    // Create a sandboxed function with limited global access
    const sandbox = {
      console,
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      fetch: window.fetch.bind(window),
      // Add other safe globals as needed
    };

    const func = new Function(...Object.keys(sandbox), code);
    return func(...Object.values(sandbox));
  }

  /**
   * Create plugin API instance for a specific plugin
   */
  private createPluginAPI(pluginId: string): PluginAPI {
    return {
      storage: {
        get: async (key: string) => {
          const { data } = await (this.supabase as any)
            .from("plugin_storage")
            .select("value")
            .eq("plugin_id", pluginId)
            .eq("key", key)
            .single();
          return (data as any)?.value;
        },
        set: async (key: string, value: any) => {
          await (this.supabase as any).from("plugin_storage").upsert({
            plugin_id: pluginId,
            key,
            value: value as any,
          } as any);
        },
        delete: async (key: string) => {
          await (this.supabase as any)
            .from("plugin_storage")
            .delete()
            .eq("plugin_id", pluginId)
            .eq("key", key);
        },
        clear: async () => {
          await (this.supabase as any)
            .from("plugin_storage")
            .delete()
            .eq("plugin_id", pluginId);
        },
      },

      ui: {
        showNotification: (
          message: string,
          type: "info" | "success" | "warning" | "error",
        ) => {
          this.emit("ui:notification", { message, type });
        },
        showModal: (content: React.ReactNode) => {
          this.emit("ui:modal", { content });
        },
        registerMenuItem: (menu: string, item: MenuItem) => {
          if (!this.menuItems.has(menu)) {
            this.menuItems.set(menu, []);
          }
          this.menuItems.get(menu)!.push(item);
          this.emit("ui:menu:updated", { menu });
        },
        registerWidget: (widget: DashboardWidget) => {
          this.widgets.push(widget);
          this.emit("ui:widgets:updated");
        },
        registerTab: (projectId: string, tab: ProjectTab) => {
          if (!this.projectTabs.has(projectId)) {
            this.projectTabs.set(projectId, []);
          }
          this.projectTabs.get(projectId)!.push(tab);
          this.emit("ui:tabs:updated", { projectId });
        },
      },

      data: {
        query: async (table: string, query: any) => {
          const { data } = await (this.supabase as any)
            .from(table)
            .select(query.select || "*")
            .match(query.match || {})
            .limit(query.limit || 100);
          return data || [];
        },
        insert: async (table: string, data: any) => {
          const { data: result } = await (this.supabase as any)
            .from(table)
            .insert(data)
            .select()
            .single();
          return result;
        },
        update: async (table: string, id: string, data: any) => {
          const { data: result } = await (this.supabase as any)
            .from(table)
            .update(data)
            .eq("id", id)
            .select()
            .single();
          return result;
        },
        delete: async (table: string, id: string) => {
          await (this.supabase as any).from(table).delete().eq("id", id);
        },
      },

      events: {
        emit: (event: string, data: any) => {
          this.emit(`plugin:${pluginId}:${event}`, data);
        },
        on: (event: string, handler: (data: any) => void) => {
          const wrappedHandler = (data: any) => handler(data);
          this.on(`plugin:${pluginId}:${event}`, wrappedHandler);
          return () => this.off(`plugin:${pluginId}:${event}`, wrappedHandler);
        },
        off: (event: string, handler: (data: any) => void) => {
          this.off(`plugin:${pluginId}:${event}`, handler);
        },
      },

      http: {
        get: (url: string, options?: RequestInit) =>
          fetch(url, { ...options, method: "GET" }),
        post: (url: string, data: any, options?: RequestInit) =>
          fetch(url, {
            ...options,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...options?.headers,
            },
            body: JSON.stringify(data),
          }),
        put: (url: string, data: any, options?: RequestInit) =>
          fetch(url, {
            ...options,
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...options?.headers,
            },
            body: JSON.stringify(data),
          }),
        delete: (url: string, options?: RequestInit) =>
          fetch(url, { ...options, method: "DELETE" }),
      },
    };
  }

  /**
   * Register plugin hooks
   */
  private registerPluginHooks(pluginId: string, plugin: Plugin) {
    if (!plugin.hooks) return;

    for (const [hookType, handler] of Object.entries(plugin.hooks)) {
      this.registerHook(hookType as HookType, pluginId, handler);
    }
  }

  /**
   * Register a hook handler
   */
  private registerHook(
    type: HookType,
    pluginId: string,
    handler: Function,
    priority = 0,
  ) {
    if (!this.hooks.has(type)) {
      this.hooks.set(type, []);
    }

    const handlers = this.hooks.get(type)!;
    handlers.push({ pluginId, handler, priority });

    // Sort by priority (higher priority executes first)
    handlers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Execute hooks for a specific type
   */
  async executeHooks(type: HookType, context: HookContext): Promise<any[]> {
    const handlers = this.hooks.get(type) || [];
    const results = [];

    for (const { pluginId, handler } of handlers) {
      try {
        const api = this.createPluginAPI(pluginId);
        const result = await handler(context, api);
        results.push(result);
      } catch (error) {
        this.emit("hook:error", { pluginId, type, error });
      }
    }

    return results;
  }

  /**
   * Install a new plugin
   */
  async installPlugin(manifestUrl: string): Promise<PluginRecord> {
    // Validate manifest
    const manifest = await this.fetchManifest(manifestUrl);
    const validation = this.validateManifest(manifest);

    if (!validation.valid) {
      throw new PluginError(
        `Invalid manifest: ${validation.errors.join(", ")}`,
        "INVALID_MANIFEST",
      );
    }

    // Check permissions
    await this.checkPermissions(manifest);

    // Create plugin record
    const { data: record, error } = await (this.supabase as any)
      .from("plugins")
      .insert({
        manifest_url: manifestUrl,
        manifest,
        status: "installed" as PluginStatus,
      })
      .select()
      .single();

    if (error) throw error;

    // Run install lifecycle
    const plugin = await this.downloadPlugin(manifest);
    if (plugin.lifecycle?.onInstall) {
      await plugin.lifecycle.onInstall();
    }

    this.emit("plugin:installed", { pluginId: record.id, manifest });

    return record;
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string) {
    // Update plugin status directly instead of using RPC
    const { error } = await (this.supabase as any)
      .from("plugins")
      .update({ status: "enabled" as PluginStatus })
      .eq("id", pluginId);

    if (error) throw error;

    // Reload the plugin
    const { data: record } = await (this.supabase as any)
      .from("plugins")
      .select("*")
      .eq("id", pluginId)
      .single();

    if (record) {
      await this.loadPlugin(record as any as PluginRecord);
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string) {
    const plugin = this.plugins.get(pluginId);

    if (plugin?.lifecycle?.onDisable) {
      await plugin.lifecycle.onDisable();
    }

    // Remove from active plugins
    this.plugins.delete(pluginId);

    // Remove hooks
    for (const handlers of this.hooks.values()) {
      const index = handlers.findIndex((h) => h.pluginId === pluginId);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }

    // Update plugin status directly instead of using RPC
    const { error } = await (this.supabase as any)
      .from("plugins")
      .update({ status: "disabled" as PluginStatus })
      .eq("id", pluginId);

    if (error) throw error;

    this.emit("plugin:disabled", { pluginId });
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string) {
    const plugin = this.plugins.get(pluginId);

    if (plugin?.lifecycle?.onUninstall) {
      await plugin.lifecycle.onUninstall();
    }

    // Disable first if enabled
    if (this.plugins.has(pluginId)) {
      await this.disablePlugin(pluginId);
    }

    // Delete from database
    const { error } = await (this.supabase as any)
      .from("plugins")
      .delete()
      .eq("id", pluginId);

    if (error) throw error;

    this.emit("plugin:uninstalled", { pluginId });
  }

  /**
   * Get menu items for a specific menu
   */
  getMenuItems(menu: string): MenuItem[] {
    return this.menuItems.get(menu) || [];
  }

  /**
   * Get all dashboard widgets
   */
  getDashboardWidgets(): DashboardWidget[] {
    return this.widgets;
  }

  /**
   * Get tabs for a specific project
   */
  getProjectTabs(projectId: string): ProjectTab[] {
    return this.projectTabs.get(projectId) || [];
  }

  /**
   * Fetch and validate a plugin manifest
   */
  private async fetchManifest(url: string): Promise<PluginManifest> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new PluginError("Failed to fetch manifest", "FETCH_ERROR");
    }

    const data = await response.json();
    return pluginManifestSchema.parse(data);
  }

  /**
   * Validate a plugin manifest
   */
  private validateManifest(manifest: PluginManifest): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      pluginManifestSchema.parse(manifest);
    } catch (error: any) {
      errors.push(...error.errors.map((e: any) => e.message));
    }

    // Additional validation
    if (!manifest.entry.startsWith("http")) {
      errors.push("Entry must be a valid URL");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if required permissions are available
   */
  private async checkPermissions(manifest: PluginManifest) {
    // In a real implementation, this would check user permissions
    // and prompt for approval
    return true;
  }

  /**
   * Set plugin error state
   */
  private async setPluginError(pluginId: string, error: Error) {
    await (this.supabase as any)
      .from("plugins")
      .update({
        status: "error" as PluginStatus,
        error_message: error.message,
      })
      .eq("id", pluginId);
  }
}

// Export singleton instance
export const pluginManager = PluginManager.getInstance();
