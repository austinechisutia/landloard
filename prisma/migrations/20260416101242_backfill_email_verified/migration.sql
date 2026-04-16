-- Backfill emailVerified for users who registered before email verification was required.
-- Sets emailVerified = createdAt so existing credential users can still sign in.
UPDATE "User"
SET "emailVerified" = "createdAt"
WHERE "emailVerified" IS NULL
  AND "passwordHash" IS NOT NULL;