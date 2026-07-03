# miniCRM

Klinika uchun lidlarni (mijozlarni) boshqarish CRM tizimi. Lidlar
avtomatik ravishda operatorlarga taqsimlanadi, ular kanban doskasida
holatlari bo'yicha kuzatiladi va hisobotlar shaklida tahlil qilinadi.

## Imkoniyatlar

- **Lidlar kanban doskasi** (`/lidlar`) — lidlarni holat bo'yicha drag & drop
  bilan boshqarish.
- **Mening lidlarim** (`/mening-lidlarim`) — operatorga biriktirilgan lidlar.
- **Hisobotlar** (`/hisobotlar`) — konversiya, manba va operator kesimida
  statistika (recharts).
- **Operatorlar** (`/operatorlar`) — admin tomonidan operator hisoblarini
  yaratish va boshqarish.
- **Round-robin taqsimot** — yangi lid `get_next_operator` RPC orqali navbat
  bilan operatorga biriktiriladi.
- **Rollar va RLS** — `admin` va `operator` rollari, Supabase RLS siyosatlari
  bilan himoyalangan.

## Texnologiyalar

| Qatlam      | Texnologiya                                             |
| ----------- | ------------------------------------------------------- |
| Framework   | [TanStack Start](https://tanstack.com/start) + React 19 |
| Routing     | TanStack Router (fayl asosidagi)                        |
| Ma'lumotlar | [Supabase](https://supabase.com) (Postgres, Auth, RLS)  |
| UI          | shadcn/ui (Radix) + Tailwind CSS v4                     |
| Formalar    | react-hook-form + Zod                                   |
| So'rovlar   | TanStack Query                                          |
| Grafiklar   | Recharts                                                |
| Paket       | [Bun](https://bun.sh)                                   |

## Ishga tushirish

Talab: [Bun](https://bun.sh) o'rnatilgan bo'lishi kerak.

```bash
# 1. Bog'liqliklarni o'rnatish
bun install

# 2. Muhit o'zgaruvchilarini sozlash
cp .env.example .env
# .env faylini Supabase qiymatlaringiz bilan to'ldiring

# 3. Dev serverni ishga tushirish
bun run dev
```

Ilova `http://localhost:3000` (yoki Vite ko'rsatgan port) da ochiladi.

## Skriptlar

| Buyruq            | Vazifa                            |
| ----------------- | --------------------------------- |
| `bun run dev`     | Dev server (HMR bilan)            |
| `bun run build`   | Ishlab chiqarish uchun build      |
| `bun run preview` | Build qilingan ilovani ko'rish    |
| `bun run lint`    | ESLint tekshiruvi                 |
| `bun run format`  | Prettier bilan formatlash         |
| `bun run test`    | Vitest testlarini ishga tushirish |

## Muhit o'zgaruvchilari

Barcha kerakli o'zgaruvchilar `.env.example` da keltirilgan. `VITE_` prefiksli
o'zgaruvchilar brauzerga uzatiladi — faqat **publishable (anon)** kalitdan
foydalaning, `service_role` kalitini hech qachon client tomoniga qo'ymang.

## Loyiha tuzilishi

```
src/
  routes/              # Fayl asosidagi marshrutlar (TanStack Router)
    _authenticated/    # Login talab qiladigan sahifalar
  components/
    ui/                # shadcn/ui komponentlari
    lidlar-kanban.tsx  # Kanban doskasi
  lib/
    crm.ts             # Lid holatlari, manbalar, yorliqlar, formatlash
    users.functions.ts # Server funksiya: operator yaratish (admin)
  integrations/
    supabase/          # Supabase client va auth middleware
supabase/
  migrations/          # SQL migratsiyalar (sxema, RLS, triggerlar)
```

## Ma'lumotlar bazasi

Sxema, RLS siyosatlari va triggerlar `supabase/migrations/` ichida. Asosiy
jadvallar: `leads`, `operators`, `user_roles`. Lid taqsimoti uchun
`get_next_operator` va rolni tekshirish uchun `has_role` RPC funksiyalari
ishlatiladi.
