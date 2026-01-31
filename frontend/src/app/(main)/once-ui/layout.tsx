"use client";

// REMOVED: Once UI system causing CSS conflicts with shadcn
// import "@once-ui-system/core/css/styles.css";
// import "@once-ui-system/core/css/tokens.css";

// import {
//   LayoutProvider,
//   ThemeProvider,
//   ToastProvider,
// } from "@once-ui-system/core";

export default function OnceUILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* REMOVED: Once UI providers causing CSS conflicts */}
      {children}
    </div>
  );
}
