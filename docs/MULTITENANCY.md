# Multi-tenancy (ko'p klinikalik) — dizayn va joriy etish

Bu hujjat miniCRM'ni **bitta klinika** vositasidan **ko'plab klinikalarga
sotiladigan SaaS** mahsulotga aylantirishning birinchi va eng muhim qadamini
— ma'lumotlarni klinikalar bo'yicha to'liq ajratishni (tenant isolation) —
tavsiflaydi.

> ⚠️ Migratsiya jonli bazaga **avtomatik qo'llanmadi**. U
> `supabase/migrations/20260630120000_multi_tenancy_foundation.sql` faylida
> ko'rib chiqish uchun turibdi. Quyidagi bosqichlarga amal qiling.

## Model

```
clinics (tenant)
  └── operators        (clinic_id)
  └── user_roles       (clinic_id)  ← foydalanuvchi qaysi klinikada va qanday rolda
  └── leads            (clinic_id)
        └── lead_status_history      (clinic_id)
        └── lead_assignment_history  (clinic_id)
        └── call_logs                (clinic_id)
  └── operator_rr_counter (clinic_id) ← har klinikaga alohida navbat
```

- Har bir asosiy jadvalga `clinic_id` qo'shildi.
- `current_clinic_id()` funksiyasi joriy foydalanuvchi (`auth.uid()`) qaysi
  klinikaga tegishli ekanini `user_roles` dan aniqlaydi.
- **RLS** har bir jadvalni `clinic_id = current_clinic_id()` bilan cheklaydi —
  foydalanuvchi faqat o'z klinikasining ma'lumotini ko'radi.
- `anon` (autentifikatsiyasiz) endi jadvallarga to'g'ridan-to'g'ri kira
  olmaydi. Bu joriy holatdagi **xavfsizlik teshigini ham yopadi** (hozir
  hamma jadval `USING (true)` bilan hammaga ochiq).

## Migratsiya nimani qiladi

1. `clinics` jadvalini va `default` (Asosiy klinika) yozuvini yaratadi.
2. Asosiy jadvallarga `clinic_id` ustunini qo'shadi (avval nullable).
3. Mavjud barcha yozuvlarni `default` klinikaga biriktiradi (backfill).
4. `clinic_id` ni `NOT NULL` qiladi va indekslar qo'shadi.
5. `current_clinic_id()` yordamchi funksiyasini yaratadi.
6. Eski "hammaga ochiq" RLS siyosatlarini olib tashlab, klinika bo'yicha
   izolyatsiyalovchi siyosatlar o'rnatadi.
7. Hisobot view'larini `security_invoker=on` qiladi (ular ham RLS ga
   bo'ysunadi).
8. Round-robin taqsimotni klinika bo'yicha qiladi: `get_next_operator(clinic_id)`.
9. Takroriy telefon tekshiruvini klinika ichida ishlaydigan qiladi.

## Joriy etish bosqichlari (xavfsiz tartib)

1. **Zaxira oling.** Supabase Dashboard → Database → Backups.
2. **Test branch'da sinang.** Supabase'da branch yarating va migratsiyani
   avval o'sha yerda qo'llang (`supabase db push` yoki MCP `apply_migration`).
3. Migratsiyadan keyin **administrator hisobini tekshiring**: u `user_roles`
   da `clinic_id` bilan yozuvga ega bo'lishi shart, aks holda
   `current_clinic_id()` `NULL` qaytaradi va u hech narsa ko'rmaydi.
4. Ilovaning quyidagi **kod o'zgarishlarini** qo'llang (pastga qarang).
5. TypeScript turlarini qayta generatsiya qiling:
   `supabase gen types typescript ... > src/integrations/supabase/types.ts`.
6. Hammasini test branch'da tekshirib, keyin asosiy bazaga qo'llang.

## Zarur bo'ladigan kod o'zgarishlari (keyingi qadam)

Migratsiya qo'llanib, turlar qayta generatsiya qilingach:

- **`src/lib/users.functions.ts`** — admin operator yaratganda yangi
  `operators` va `user_roles` yozuvlariga adminning `clinic_id` si qo'yiladi.
- **Klikent so'rovlari** (lidlar, hisobotlar) — RLS avtomatik filtrlaganligi
  sababli ko'p hollarda o'zgarish shart emas, lekin yangi yozuvlarda
  (`insert`) `clinic_id` ni berish kerak bo'lishi mumkin.
- **Onboarding** — yangi klinika ro'yxatdan o'tganda: `clinics` ga yozuv,
  birinchi admin foydalanuvchi va uning `user_roles` yozuvi yaratiladi.

## Keyingi SaaS qadamlari (ushbu asosdan so'ng)

1. Klinika ro'yxatdan o'tish / onboarding sehrgari.
2. To'lov / obuna (Payme / Click / Uzum) va tarif limitlari.
3. Yuridik: maxfiylik siyosati, foydalanish shartlari, bemordan rozilik.
4. Qabul jadvali (kalendar) va SMS eslatmalar (Eskiz.uz / Play Mobile).
5. Branding / white-label (har klinikaning logosi, domeni).

Batafsil yo'l xaritasi uchun jamoaviy muhokama tavsiya etiladi.
