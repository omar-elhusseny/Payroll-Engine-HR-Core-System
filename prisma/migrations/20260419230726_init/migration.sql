-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('HR_ADMIN', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "AdvanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "industry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "managerId" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT,
    "name" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "jobTitle" TEXT,
    "hireDate" DATE NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_locations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "fenceRadiusM" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "office_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advances" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "approvedBy" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "status" "AdvanceStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "deductedInId" TEXT,

    CONSTRAINT "advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'PENDING',
    "triggeredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "grossSalary" DECIMAL(12,2) NOT NULL,
    "taxDeduction" DECIMAL(12,2) NOT NULL,
    "insuranceEmployee" DECIMAL(12,2) NOT NULL,
    "insuranceEmployer" DECIMAL(12,2) NOT NULL,
    "advanceDeduction" DECIMAL(12,2) NOT NULL,
    "netSalary" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_taxId_key" ON "companies"("taxId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_nationalId_key" ON "employees"("nationalId");

-- CreateIndex
CREATE INDEX "employees_companyId_idx" ON "employees"("companyId");

-- CreateIndex
CREATE INDEX "employees_nationalId_idx" ON "employees"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeId_key" ON "users"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "attendances_employeeId_idx" ON "attendances"("employeeId");

-- CreateIndex
CREATE INDEX "attendances_clockIn_idx" ON "attendances"("clockIn");

-- CreateIndex
CREATE INDEX "advances_employeeId_idx" ON "advances"("employeeId");

-- CreateIndex
CREATE INDEX "advances_status_idx" ON "advances"("status");

-- CreateIndex
CREATE INDEX "payroll_runs_companyId_idx" ON "payroll_runs"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_companyId_month_year_key" ON "payroll_runs"("companyId", "month", "year");

-- CreateIndex
CREATE INDEX "payslips_payrollRunId_idx" ON "payslips"("payrollRunId");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_employeeId_payrollRunId_key" ON "payslips"("employeeId", "payrollRunId");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_locations" ADD CONSTRAINT "office_locations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "office_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_deductedInId_fkey" FOREIGN KEY ("deductedInId") REFERENCES "payroll_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_triggeredBy_fkey" FOREIGN KEY ("triggeredBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
