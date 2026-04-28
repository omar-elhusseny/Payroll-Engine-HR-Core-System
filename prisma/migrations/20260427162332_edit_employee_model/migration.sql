/*
  Warnings:

  - Added the required column `netSalary` to the `employees` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "netSalary" DECIMAL(12,2) NOT NULL;
