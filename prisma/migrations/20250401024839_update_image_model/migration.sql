/*
  Warnings:

  - You are about to drop the column `asset_id` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `public_id` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `secure_url` on the `Image` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Image` DROP COLUMN `asset_id`,
    DROP COLUMN `public_id`,
    DROP COLUMN `secure_url`;
