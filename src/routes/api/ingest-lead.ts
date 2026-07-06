import { createFileRoute } from "@tanstack/react-router";
import { handleWebLeadWebhook } from "@/lib/web-lead-ingest.server";

export const Route = createFileRoute("/api/ingest-lead")({
  server: {
    handlers: {
      POST: ({ request }) => handleWebLeadWebhook(request),
      OPTIONS: ({ request }) => handleWebLeadWebhook(request),
    },
  },
});
