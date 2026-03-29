/**
 * Plugin Settings Page
 * Admin interface for managing plugins
 */

import { PluginManagerUI } from "@/components/plugins/plugin-manager-ui";

export default function PluginsSettingsPage() {
  return (
    <div className="container mx-auto py-6">
      <PluginManagerUI />
    </div>
  );
}
