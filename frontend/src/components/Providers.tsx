"use client";

// REMOVED: Once UI system causing CSS conflicts with shadcn
// import { BorderStyle, ChartMode, ChartVariant, DataThemeProvider, IconProvider, LayoutProvider, NeutralColor, ScalingSize, Schemes, SolidStyle, SolidType, SurfaceStyle, Theme, ThemeProvider, ToastProvider, TransitionStyle } from "@once-ui-system/core";
// import { style, dataStyle } from "../resources/once-ui.config";
// import { iconLibrary } from "../resources/icons";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* REMOVED: Once UI providers causing CSS conflicts with shadcn */}
      {children}
    </div>
  );
}