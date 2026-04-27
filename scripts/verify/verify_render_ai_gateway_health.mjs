#!/usr/bin/env node

const backendUrl = (
  process.env.PYTHON_BACKEND_URL ||
  process.env.RENDER_BACKEND_URL ||
  "https://alleato-backend-3mmq.onrender.com"
).replace(/\/$/, "");

async function main() {
  const response = await fetch(`${backendUrl}/health`, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Render backend health returned HTTP ${response.status}`);
  }

  const health = await response.json();
  const failures = [];

  if (health.ai_gateway_configured !== true) {
    failures.push("AI_GATEWAY_API_KEY is not visible to the Render backend");
  }

  if (health.embedding_provider_configured !== true) {
    failures.push("No embedding provider is configured on the Render backend");
  }

  if ("supabase_service_configured" in health && health.supabase_service_configured !== true) {
    failures.push("Supabase service key is not visible to the Render backend");
  }

  if (failures.length > 0) {
    console.error("Render AI health check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    console.error(`Backend: ${backendUrl}`);
    console.error(`Health payload: ${JSON.stringify(health)}`);
    process.exit(1);
  }

  console.log("Render AI health check passed");
  console.log(JSON.stringify(health));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
