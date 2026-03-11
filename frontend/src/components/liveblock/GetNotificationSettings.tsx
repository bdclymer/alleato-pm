"use client";

import { useNotificationSettings } from "@liveblocks/react";

export function GetNotificationSettingsExample() {
  const [{ isLoading, error, settings }] = useNotificationSettings();

  if (isLoading) return null;
  if (error) return null; // or throw/capture error
  if (!settings.email) return null;

  return (
    <div>
      Email thread notifications: {settings.email.thread ? "On" : "Off"}
    </div>
  );
}
