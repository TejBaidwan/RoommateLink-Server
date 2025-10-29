/*
  Warnings:

  - You are about to drop the column `used` on the `EmailVerificationToken` table. All the data in the column will be lost.
  - You are about to drop the column `used` on the `PasswordResetToken` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EmailVerificationToken" DROP COLUMN "used";

-- AlterTable
ALTER TABLE "PasswordResetToken" DROP COLUMN "used";
