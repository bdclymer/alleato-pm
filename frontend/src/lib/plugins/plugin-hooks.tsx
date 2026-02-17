/**
 * Plugin Hooks System
 * Provides React hooks and components for integrating plugins into the UI
 */

import React, { useEffect, useState, useContext, createContext } from "react";
import { pluginManager } from "./plugin-manager";
import type {
  HookType,
  HookContext,
  MenuItem,
  DashboardWidget,
  ProjectTab,
} from "@/types/plugin.types";

// Plugin context for accessing plugin system
interface PluginContextValue {
  pluginManager: typeof pluginManager;
  isReady: boolean;
}

const PluginContext = createContext<PluginContextValue>({
  pluginManager,
  isReady: false,
});

/**
 * Plugin Provider component
 * Wraps the app to provide plugin context
 */
export function PluginProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize plugin system
    pluginManager.once("ready", () => {
      setIsReady(true);
    });

    // Handle plugin errors
    pluginManager.on("plugin:error", ({ pluginId, error }) => {
      console.error(`Plugin ${pluginId} error:`, error);
      // Could show a toast notification here
    });

    return () => {
      pluginManager.removeAllListeners();
    };
  }, []);

  return (
    <PluginContext.Provider value={{ pluginManager, isReady }}>
      {children}
    </PluginContext.Provider>
  );
}

/**
 * Hook to access plugin system
 */
export function usePluginSystem() {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error("usePluginSystem must be used within PluginProvider");
  }
  return context;
}

/**
 * Hook to execute plugin hooks
 */
export function usePluginHook<T = any>(
  type: HookType,
  context: Omit<HookContext, "type">,
): T[] {
  const [results, setResults] = useState<T[]>([]);
  const { pluginManager, isReady } = usePluginSystem();

  useEffect(() => {
    if (!isReady) return;

    const executeHooks = async () => {
      const hookContext: HookContext = { type, ...context };
      const hookResults = await pluginManager.executeHooks(type, hookContext);
      setResults(hookResults);
    };

    executeHooks();
  }, [type, context, isReady, pluginManager]);

  return results;
}

/**
 * Hook to get menu items for a specific menu
 */
export function usePluginMenuItems(menu: string): MenuItem[] {
  const [items, setItems] = useState<MenuItem[]>([]);
  const { pluginManager, isReady } = usePluginSystem();

  useEffect(() => {
    if (!isReady) return;

    const updateItems = () => {
      setItems(pluginManager.getMenuItems(menu));
    };

    updateItems();

    // Listen for menu updates
    pluginManager.on("ui:menu:updated", ({ menu: updatedMenu }) => {
      if (updatedMenu === menu) {
        updateItems();
      }
    });

    return () => {
      pluginManager.off("ui:menu:updated", updateItems);
    };
  }, [menu, isReady, pluginManager]);

  return items;
}

/**
 * Hook to get dashboard widgets
 */
export function usePluginWidgets(): DashboardWidget[] {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const { pluginManager, isReady } = usePluginSystem();

  useEffect(() => {
    if (!isReady) return;

    const updateWidgets = () => {
      setWidgets(pluginManager.getDashboardWidgets());
    };

    updateWidgets();

    // Listen for widget updates
    pluginManager.on("ui:widgets:updated", updateWidgets);

    return () => {
      pluginManager.off("ui:widgets:updated", updateWidgets);
    };
  }, [isReady, pluginManager]);

  return widgets;
}

/**
 * Hook to get project tabs
 */
export function usePluginProjectTabs(projectId: string): ProjectTab[] {
  const [tabs, setTabs] = useState<ProjectTab[]>([]);
  const { pluginManager, isReady } = usePluginSystem();

  useEffect(() => {
    if (!isReady) return;

    const updateTabs = () => {
      setTabs(pluginManager.getProjectTabs(projectId));
    };

    updateTabs();

    // Listen for tab updates
    pluginManager.on("ui:tabs:updated", ({ projectId: updatedProjectId }) => {
      if (updatedProjectId === projectId) {
        updateTabs();
      }
    });

    return () => {
      pluginManager.off("ui:tabs:updated", updateTabs);
    };
  }, [projectId, isReady, pluginManager]);

  return tabs;
}

/**
 * Component to render plugin menu items
 */
export function PluginMenu({
  menu,
  render,
}: {
  menu: string;
  render: (items: MenuItem[]) => React.ReactNode;
}) {
  const items = usePluginMenuItems(menu);
  const filteredItems = items.filter(
    (item) => !item.condition || item.condition(),
  );

  return <>{render(filteredItems)}</>;
}

/**
 * Component to render plugin widgets
 */
export function PluginWidgets({
  render,
}: {
  render: (widgets: DashboardWidget[]) => React.ReactNode;
}) {
  const widgets = usePluginWidgets();
  return <>{render(widgets)}</>;
}

/**
 * Component to render plugin project tabs
 */
export function PluginProjectTabs({
  projectId,
  project,
  render,
}: {
  projectId: string;
  project: any;
  render: (tabs: ProjectTab[]) => React.ReactNode;
}) {
  const tabs = usePluginProjectTabs(projectId);
  const filteredTabs = tabs.filter(
    (tab) => !tab.condition || tab.condition(project),
  );

  return <>{render(filteredTabs)}</>;
}

/**
 * Higher-order component to inject plugin hooks
 */
export function withPluginHooks<P extends object>(
  Component: React.ComponentType<P & { pluginHookResults?: any[] }>,
  hookType: HookType,
  getContext: (props: P) => Omit<HookContext, "type">,
) {
  return (props: P) => {
    const context = getContext(props);
    const results = usePluginHook(hookType, context);

    return <Component {...props} pluginHookResults={results} />;
  };
}

/**
 * Hook to handle plugin notifications
 */
export function usePluginNotifications() {
  const { pluginManager } = usePluginSystem();

  useEffect(() => {
    const handleNotification = ({ message, type }: any) => {
      // Integrate with your app's notification system
      // Integrate with app notification system when available
    };

    pluginManager.on("ui:notification", handleNotification);

    return () => {
      pluginManager.off("ui:notification", handleNotification);
    };
  }, [pluginManager]);
}

/**
 * Hook to handle plugin modals
 */
export function usePluginModals() {
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(
    null,
  );
  const { pluginManager } = usePluginSystem();

  useEffect(() => {
    const handleModal = ({ content }: any) => {
      setModalContent(content);
    };

    pluginManager.on("ui:modal", handleModal);

    return () => {
      pluginManager.off("ui:modal", handleModal);
    };
  }, [pluginManager]);

  const closeModal = () => setModalContent(null);

  return { modalContent, closeModal };
}

/**
 * Utility to create a plugin-aware component
 */
export function createPluginComponent<P extends object>(
  baseComponent: React.ComponentType<P>,
  options: {
    beforeHook?: HookType;
    afterHook?: HookType;
    menuSlot?: string;
    widgetSlot?: boolean;
  },
) {
  return (props: P & { pluginContext?: any }) => {
    const { beforeHook, afterHook, menuSlot } = options;
    const context = props.pluginContext || {};

    // Execute before hooks
    const beforeResults = usePluginHook(
      beforeHook || ("api:request" as HookType),
      beforeHook ? context : {},
    );

    // Execute after hooks
    const afterResults = usePluginHook(
      afterHook || ("api:response" as HookType),
      afterHook ? context : {},
    );

    // Get menu items if menu slot is specified
    const menuItems = menuSlot ? usePluginMenuItems(menuSlot) : [];

    const enhancedProps = {
      ...props,
      pluginBeforeResults: beforeResults,
      pluginAfterResults: afterResults,
      pluginMenuItems: menuItems,
    };

    return React.createElement(baseComponent, enhancedProps);
  };
}
