# Clinic OS — To'liq Build Plan (Shaxzod Medical)

> Maqsad: Shaxzod Medical'ni bitta klinikalik to'liq ERP'ga o'tkazish. Stack: Lovable (UI) + Supabase (Postgres/Auth/RLS/Edge Functions/Storage) + Claude Code/Cowork (qurish). Eski lead-CRM shu tizim bilan almashtiriladi (data ko'chiriladi).
>
> Bu hujjat — "reja/chizma". Har fazani Claude Code/Cowork bilan ketma-ket bajarasan; har fazaning oxirida test gate bor — o'tmasa keyingisiga o'tmaymiz.

---

## Build order (10 faza)

0. Setup — Backup, loyiha, env
1. **Fundament** — clinics, users, roles, permissions, audit_log + standart naqshlar ✅
2. Kunlik yadro + CRM ko'chirish — patients, appointments, rooms, check_ins, waitlist, leads
3. Doctors — doctors, schedules, time_off, performance
4. Moliya — invoices, items, payments, refunds, insurance, ledger, expenses
5. Klinik — lab, radiology, pharmacy
6. Operatsiyalar — inventory, suppliers, PO, HR, payroll
7. Intellekt — notifications, automation, event bus
8. O'sish — campaigns, leads→conversion, deals + Yuboraman/n8n
9. Hisobot — snapshot jadvallar + read endpoint
10. AI Markaz — insights, conversations, actions

---

## Status mapping (eski CRM → Clinic OS)

| Eski status | Yangi joy |
|---|---|
| Yangi | leads.status = new |
| Ko'tarmadi | leads.status = no_answer |
| Sifatsiz lid | leads.status = unqualified |
| Konsultatsiyaga yozildi | leads.status = converted + patients + appointments |
| Konsultatsiyada bo'ldi | appointments.status = completed |
| Yotishga yozildi (KONVERSIYA) | patients (active) + deals/invoice |

---

*To'liq reja 01_Clinic_OS_Build_Plan.md faylida.*
