/*
  Warnings:

  - You are about to drop the column `baseSalary` on the `employees` table. All the data in the column will be lost.
  - Added the required column `grossSalary` to the `employees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attendanceDeduction` to the `payslips` table without a default value. This is not possible if the table is not empty.
  - Added the required column `otherDeductions` to the `payslips` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "lateMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "baseSalary",
ADD COLUMN     "grossSalary" DECIMAL(12,2) NOT NULL;

-- AlterTable
ALTER TABLE "office_locations" ADD COLUMN     "shiftEndTime" TEXT NOT NULL DEFAULT '17:00',
ADD COLUMN     "shiftStartTime" TEXT NOT NULL DEFAULT '09:00';

-- AlterTable
ALTER TABLE "payslips" ADD COLUMN     "attendanceDeduction" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "otherDeductions" DECIMAL(12,2) NOT NULL;

-- CreateTable
CREATE TABLE "deductions" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "absenceAmount" DECIMAL(12,2) NOT NULL,
    "latenessAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "deductedInId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deductions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deductions_employeeId_idx" ON "deductions"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "deductions_employeeId_month_year_key" ON "deductions"("employeeId", "month", "year");

-- AddForeignKey
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_deductedInId_fkey" FOREIGN KEY ("deductedInId") REFERENCES "payroll_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
