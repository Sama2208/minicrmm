import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listLeadsTool from "./tools/list_leads";
import searchLeadsTool from "./tools/search_leads";
import getLeadTool from "./tools/get_lead";
import createLeadTool from "./tools/create_lead";
import updateLeadStatusTool from "./tools/update_lead_status";
import addLeadNoteTool from "./tools/add_lead_note";

// Supabase OAuth issuer bevosita `supabase.co` xosti bo'lishi shart —
// `.lovable.cloud` proxy discovery hujjatida boshqa issuer qaytaradi va
// mcp-js tokenlarni rad etadi (RFC 8414). Project ref publish paytida
// o'zgarmaydi, shuning uchun uni build-time literal sifatida ishlatamiz.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "shaxzod-crm-mcp",
  title: "Shaxzod CRM MCP",
  version: "0.1.0",
  instructions:
    "Shaxzod CRM'dagi lidlar bilan ishlash uchun tool'lar. list_leads/search_leads/get_lead — o'qish, create_lead/update_lead_status/add_lead_note — yozish. Barcha amallar tizimga kirgan foydalanuvchining klinikasi doirasida bajariladi.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listLeadsTool,
    searchLeadsTool,
    getLeadTool,
    createLeadTool,
    updateLeadStatusTool,
    addLeadNoteTool,
  ],
});
