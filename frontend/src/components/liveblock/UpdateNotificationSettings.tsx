"use client";

import type { ChangeEvent } from "react";
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from "@liveblocks/react";

export function UpdateNotificationSettingsExample() {
  const [{ isLoading, error, settings }] = useNotificationSettings();
  const updateNotificationSettings = useUpdateNotificationSettings();

  if (isLoading) return null;
  if (error) return null; // or throw/capture error
  if (!settings.email) return null;

  return (
    <div>
      <input
        id="emailThreadNotification"
        type="checkbox"
        checked={settings.email.thread}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          updateNotificationSettings({
            email: {
              thread: event.target.checked,
            },
          });
        }}
      />
    </div>
  );
}
