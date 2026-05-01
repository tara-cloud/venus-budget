export interface ParsedSms {
  amount: number;
  type: "income" | "expense";
  accountTail?: string;
  date?: Date;
  description: string;
  bank?: string;
  confidence: "high" | "medium" | "low";
}

interface SmsRule {
  bank: string;
  patterns: RegExp[];
  type: "debit" | "credit";
}

const RULES: SmsRule[] = [
  // HDFC debit
  {
    bank: "HDFC",
    type: "debit",
    patterns: [
      /(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)\s+(?:has been\s+)?debited\s+(?:from|to)\s+(?:A\/c|Acct|account)\s*[Xx*]*(?<tail>\d{4})/i,
      /debited\s+(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)\s+from\s+(?:A\/c|Acct)\s*[Xx*]*(?<tail>\d{4})/i,
    ],
  },
  // HDFC credit
  {
    bank: "HDFC",
    type: "credit",
    patterns: [
      /(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)\s+(?:has been\s+)?credited\s+to\s+(?:A\/c|Acct|account)\s*[Xx*]*(?<tail>\d{4})/i,
    ],
  },
  // ICICI debit
  {
    bank: "ICICI",
    type: "debit",
    patterns: [
      /Rs\.?\s*(?<amount>[\d,]+\.?\d*)\s+debited\s+from\s+ICICI\s+Bank\s+A\/c\s+[Xx*]*(?<tail>\d{4})/i,
      /(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)\s+(?:is\s+)?debited\s+from\s+Acct\s+[Xx*]*(?<tail>\d{4})/i,
    ],
  },
  // ICICI credit
  {
    bank: "ICICI",
    type: "credit",
    patterns: [
      /Rs\.?\s*(?<amount>[\d,]+\.?\d*)\s+credited\s+to\s+(?:ICICI\s+Bank\s+)?(?:A\/c|Acct)\s+[Xx*]*(?<tail>\d{4})/i,
    ],
  },
  // SBI debit
  {
    bank: "SBI",
    type: "debit",
    patterns: [
      /(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)\s+(?:debited|withdrawn)\s+(?:from\s+)?(?:your\s+)?(?:A\/c|account)\s*[Xx*]*(?<tail>\d{4})/i,
    ],
  },
  // SBI credit
  {
    bank: "SBI",
    type: "credit",
    patterns: [
      /(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)\s+credited\s+(?:to\s+)?(?:your\s+)?(?:A\/c|account)\s*[Xx*]*(?<tail>\d{4})/i,
    ],
  },
  // Axis debit
  {
    bank: "Axis",
    type: "debit",
    patterns: [
      /Rs\.?\s*(?<amount>[\d,]+\.?\d*)\s+(?:has been\s+)?(?:debited|spent)\s+from\s+(?:Axis\s+Bank\s+)?(?:A\/c|Acct)\s+[Xx*]*(?<tail>\d{4})/i,
    ],
  },
  // Generic debit (fallback)
  {
    bank: "Unknown",
    type: "debit",
    patterns: [
      /(?:debited|debit|spent|withdrawn)\D{0,20}(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)/i,
      /(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)\D{0,10}(?:debited|debit|withdrawn)/i,
    ],
  },
  // Generic credit (fallback)
  {
    bank: "Unknown",
    type: "credit",
    patterns: [
      /(?:credited|credit|received)\D{0,20}(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)/i,
      /(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)\D{0,10}(?:credited|credit|received)/i,
    ],
  },
];

const DATE_PATTERNS = [
  /(?<d>\d{2})[/-](?<m>\d{2})[/-](?<y>\d{4})/,
  /(?<d>\d{2})[/-](?<m>\d{2})[/-](?<y>\d{2})/,
  /(?<d>\d{2})-(?<mon>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(?<y>\d{4})/i,
];

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseDate(text: string): Date | undefined {
  for (const pattern of DATE_PATTERNS) {
    const m = text.match(pattern);
    if (!m?.groups) continue;
    const { d, m: mo, y, mon } = m.groups;
    if (mon) {
      return new Date(parseInt(y), MONTH_MAP[mon.toLowerCase()], parseInt(d));
    }
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    return new Date(year, parseInt(mo) - 1, parseInt(d));
  }
  return undefined;
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, ""));
}

export function parseSms(text: string): ParsedSms | null {
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (!match?.groups?.amount) continue;

      const amount = parseAmount(match.groups.amount);
      if (isNaN(amount) || amount <= 0) continue;

      return {
        amount,
        type: rule.type === "debit" ? "expense" : "income",
        accountTail: match.groups.tail,
        date: parseDate(text),
        description: text.slice(0, 80).trim(),
        bank: rule.bank,
        confidence: rule.bank !== "Unknown" ? "high" : "low",
      };
    }
  }
  return null;
}
