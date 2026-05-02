-- Performance indexes for common query patterns
-- Covers: dashboard date+type aggregations, transaction list filters

CREATE INDEX IF NOT EXISTS "Transaction_userId_date_type_idx"
  ON "Transaction" ("userId", "date", "type");

CREATE INDEX IF NOT EXISTS "Transaction_userId_accountId_date_idx"
  ON "Transaction" ("userId", "accountId", "date");

CREATE INDEX IF NOT EXISTS "Transaction_userId_type_date_idx"
  ON "Transaction" ("userId", "type", "date");
