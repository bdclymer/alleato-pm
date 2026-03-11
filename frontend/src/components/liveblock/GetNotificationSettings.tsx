import { useNotificationSettings } from "@liveblocks/react";

export function App() {
  const [{ isLoading, error, settings }] = useNotificationSettings();

  if (isLoading) return null;
  if (error) return null; // or throw/capture error

  return (
    <div>
      <Switch id="emailThreadNotification" checked={settings.email.thread} />
    </div>
  );
}