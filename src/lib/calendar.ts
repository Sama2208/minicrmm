export type CalendarDay = {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
  isToday: boolean;
};

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Dushanba (Monday) haftaning birinchi kuni sifatida hisoblanadi.
function mondayFirstWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

// Berilgan oy uchun to'liq haftalarni qamrab oluvchi kunlar ro'yxatini
// quradi (oldingi/keyingi oydan "to'ldiruvchi" kunlar bilan birga).
export function buildMonthGrid(
  year: number,
  month: number,
  today: Date = new Date(),
): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1);
  const daysBefore = mondayFirstWeekday(firstOfMonth);
  const gridStart = new Date(year, month, 1 - daysBefore);

  const lastOfMonth = new Date(year, month + 1, 0);
  const daysAfter = 6 - mondayFirstWeekday(lastOfMonth);
  const totalDays = daysBefore + lastOfMonth.getDate() + daysAfter;

  const todayKey = toDateKey(today);
  const days: CalendarDay[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const key = toDateKey(date);
    days.push({
      date,
      key,
      inCurrentMonth: date.getMonth() === month,
      isToday: key === todayKey,
    });
  }
  return days;
}

export function groupByDateKey<T>(
  items: T[],
  getKey: (item: T) => string | null | undefined,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}
