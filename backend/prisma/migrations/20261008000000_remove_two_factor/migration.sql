-- AlterTable
ALTER TABLE "users" DROP COLUMN "phone",
DROP COLUMN "phone_verified_at",
DROP COLUMN "two_factor_attempts",
DROP COLUMN "two_factor_code",
DROP COLUMN "two_factor_code_expires_at",
DROP COLUMN "two_factor_code_purpose",
DROP COLUMN "two_factor_enabled";

-- DropEnum
DROP TYPE "TwoFactorPurpose";

