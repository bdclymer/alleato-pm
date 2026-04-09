/**
 * Plugin Settings Page
 * Admin interface for managing plugins
 */

import { PluginManagerUI } from "@/components/plugins/plugin-manager-ui";
import { PageShell } from "@/components/layout";

export default function PluginsSettingsPage() {
  return (
    <PageShell variant="dashboard" title="Plugins">
      <PluginManagerUI />
    </PageShell>
  );
}
