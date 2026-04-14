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
  HookType,
  HookContext,
} from "@/types/plugin.types";
import {
  PluginStatus,
  PluginError,
  PluginValidationResult,
  MenuItem,
  DashboardWidget,
  ProjectTab,
} from "@/types/plugin.types";
import { pluginManifestSchema } from "@/types/plugin.types";
import { EventEmitter } from "events";

export class PluginManager extends EventEmitter {
  private static readonly RECORDS_STORAGE_KEY = "alleato.plugins.records";
  private static readonly PLUGIN_STORAGE_PREFIX = "alleato.plugins.storage";
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
    for (const record of (await this.listPlugins()).filter(
      (plugin) => plugin.status === PluginStatus.ENABLED,
    )) {
      try {
        await this.loadPlugin(record);
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
          return this.readPluginStorage(pluginId)[key];
        },
        set: async (key: string, value: any) => {
          const storage = this.readPluginStorage(pluginId);
          storage[key] = value;
          this.writePluginStorage(pluginId, storage);
        },
        delete: async (key: string) => {
          const storage = this.readPluginStorage(pluginId);
          delete storage[key];
          this.writePluginStorage(pluginId, storage);
        },
        clear: async () => {
          this.writePluginStorage(pluginId, {});
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

    // Create plugin record in local persistent storage.
    const record: PluginRecord = {
      id: crypto.randomUUID(),
      manifestUrl,
      manifest,
      status: PluginStatus.INSTALLED,
      installedAt: new Date(),
      updatedAt: new Date(),
    };
    const records = this.readPluginRecords();
    records.push(record);
    this.writePluginRecords(records);

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
    const records = this.readPluginRecords();
    const record = records.find((plugin) => plugin.id === pluginId);
    if (!record) {
      throw new PluginError("Plugin not found", "PLUGIN_NOT_FOUND", pluginId);
    }

    record.status = PluginStatus.ENABLED;
    record.enabledAt = new Date();
    record.updatedAt = new Date();
    this.writePluginRecords(records);

    await this.loadPlugin(record);
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

    const records = this.readPluginRecords();
    const record = records.find((plugin) => plugin.id === pluginId);
    if (record) {
      record.status = PluginStatus.DISABLED;
      record.disabledAt = new Date();
      record.updatedAt = new Date();
      this.writePluginRecords(records);
    }

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

    this.writePluginRecords(
      this.readPluginRecords().filter((plugin) => plugin.id !== pluginId),
    );
    this.clearPluginStorage(pluginId);

    this.emit("plugin:uninstalled", { pluginId });
  }

  /** Lists installed plugins from the client-side plugin registry store. */
  async listPlugins(): Promise<PluginRecord[]> {
    return this.readPluginRecords();
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
    const records = this.readPluginRecords();
    const record = records.find((plugin) => plugin.id === pluginId);
    if (!record) return;
    record.status = PluginStatus.ERROR;
    record.errorMessage = error.message;
    record.updatedAt = new Date();
    this.writePluginRecords(records);
  }

  /** Reads persisted plugin records from local storage for the browser runtime. */
  private readPluginRecords(): PluginRecord[] {
    if (typeof window === "undefined") return [];

    const raw = window.localStorage.getItem(PluginManager.RECORDS_STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as Array<
        Omit<
          PluginRecord,
          "installedAt" | "updatedAt" | "enabledAt" | "disabledAt"
        > & {
          installedAt: string;
          updatedAt: string;
          enabledAt?: string;
          disabledAt?: string;
        }
      >;

      return parsed.map((record) => ({
        ...record,
        installedAt: new Date(record.installedAt),
        updatedAt: new Date(record.updatedAt),
        enabledAt: record.enabledAt ? new Date(record.enabledAt) : undefined,
        disabledAt: record.disabledAt ? new Date(record.disabledAt) : undefined,
      }));
    } catch {
      return [];
    }
  }

  /** Persists plugin records to local storage for the browser runtime. */
  private writePluginRecords(records: PluginRecord[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      PluginManager.RECORDS_STORAGE_KEY,
      JSON.stringify(records),
    );
  }

  /** Reads plugin-private key/value storage from local storage. */
  private readPluginStorage(pluginId: string): Record<string, unknown> {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(
      `${PluginManager.PLUGIN_STORAGE_PREFIX}.${pluginId}`,
    );
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  /** Persists plugin-private key/value storage to local storage. */
  private writePluginStorage(pluginId: string, storage: Record<string, unknown>) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      `${PluginManager.PLUGIN_STORAGE_PREFIX}.${pluginId}`,
      JSON.stringify(storage),
    );
  }

  /** Removes all local storage state for a plugin when it is uninstalled. */
  private clearPluginStorage(pluginId: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(
      `${PluginManager.PLUGIN_STORAGE_PREFIX}.${pluginId}`,
    );
  }
}

// Export singleton instance
export const pluginManager = PluginManager.getInstance();
