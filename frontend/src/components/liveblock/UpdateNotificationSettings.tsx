import { 
  useNotificationSettings,
  // or useUpdateNotificationSettings
} from "@liveblocks/react";

export function App() {
  const [{ isLoading, error, settings }, useUpdateNotificationSettings] = useNotificationSettings();

  if (isLoading) return null;
  if (error) return null; // or throw/capture error

  return (
    <div>
      <Switch
        id="emailThreadNotification"
        checked={settings.email.thread}
        onChange={(event) => {
          updateChannelsNotificationSettings({
            email: {
              thread: event.target.checked,
            },
          });
        }}
      />
    </div>
  );
}