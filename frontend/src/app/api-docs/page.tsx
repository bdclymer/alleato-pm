"use client";

import { useEffect, useRef } from "react";
import SwaggerUIBundle from "swagger-ui-dist/swagger-ui-bundle.js";
import SwaggerUIStandalonePreset from "swagger-ui-dist/swagger-ui-standalone-preset.js";
import { DashboardLayout } from "@/components/layouts";
import { PageHeader } from "@/components/layout/page-header-unified";

const OPENAPI_JSON_PATH = "/openapi.json";

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const ui = SwaggerUIBundle({
      url: OPENAPI_JSON_PATH,
      domNode: containerRef.current,
      deepLinking: true,
      docExpansion: "list",
      showCommonExtensions: true,
      showExtensions: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset,
      ],
      layout: "StandaloneLayout",
      validatorUrl: null,
    });

    return () => {
      if (typeof ui?.destroy === "function") {
        ui.destroy();
      }
    };
  }, []);

  return (
    <DashboardLayout className="min-h-screen space-y-6">
      <PageHeader
        title="API Documentation"
        description="Interactive Swagger UI for the Alleato Procore frontend + backend endpoints."
        actions={
          <div className="flex flex-wrap gap-4">
            <a
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              href="/openapi.json"
              download
            >
              Download JSON
            </a>
            <a
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              href="/openapi.yaml"
              download
            >
              Download YAML
            </a>
          </div>
        }
        className="pt-4"
      />

      <div
        ref={containerRef}
        id="swagger-ui"
        className="min-h-[640px] w-full rounded-xl border border-slate-200 bg-white shadow-sm"
      />
    </DashboardLayout>
  );
}
