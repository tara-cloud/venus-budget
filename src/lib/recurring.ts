import { prisma } from "@/lib/db";
import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter } from "@/lib/date-utils";

export async function fireRecurringRules(userId: string): Promise<number> {
  const rules = await prisma.recurringRule.findMany({
    where: { userId, active: true },
  });

  let created = 0;
  const now = new Date();

  for (const rule of rules) {
    const start = rule.lastRunAt ?? rule.startDate;
    let next = nextFireDate(rule.frequency, start, rule.dayOfMonth ?? undefined);

    while (isBefore(next, now) && (!rule.endDate || isBefore(next, rule.endDate))) {
      await prisma.transaction.create({
        data: {
          userId,
          accountId: rule.accountId,
          categoryId: rule.categoryId,
          recurringRuleId: rule.id,
          amount: rule.amount,
          type: rule.type,
          description: rule.description,
          date: next,
          source: "recurring",
        },
      });
      created++;
      next = nextFireDate(rule.frequency, next, rule.dayOfMonth ?? undefined);
    }

    await prisma.recurringRule.update({
      where: { id: rule.id },
      data: { lastRunAt: now },
    });
  }

  return created;
}

function nextFireDate(
  frequency: string,
  from: Date,
  dayOfMonth?: number
): Date {
  switch (frequency) {
    case "daily":
      return addDays(from, 1);
    case "weekly":
      return addWeeks(from, 1);
    case "yearly":
      return addYears(from, 1);
    case "monthly":
    default: {
      const next = addMonths(from, 1);
      if (dayOfMonth) {
        next.setDate(Math.min(dayOfMonth, daysInMonth(next.getFullYear(), next.getMonth())));
      }
      return next;
    }
  }
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
