import prisma from '../src/prisma/client.js';
import bcrypt from 'bcryptjs';
import { calculateNetSalary } from '../src/modules/payroll/payroll.engine.js';

async function main() {
    console.log('🌱 Seeding database...\n');

    // ─────────────────────────────────────────────────────────────
    // 1. CLEANUP — wipe everything in the right order to respect
    //    foreign key constraints. Reverse order of dependencies.
    // ─────────────────────────────────────────────────────────────
    console.log('🧹 Cleaning existing data...');
    await prisma.payslip.deleteMany();
    await prisma.deduction.deleteMany();
    await prisma.advance.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.user.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.officeLocation.deleteMany();
    await prisma.department.deleteMany();
    await prisma.payrollRun.deleteMany();
    await prisma.company.deleteMany();
    console.log('✓ Clean\n');

    // ─────────────────────────────────────────────────────────────
    // 2. COMPANY
    // ─────────────────────────────────────────────────────────────
    console.log('🏢 Creating company...');
    const company = await prisma.company.create({
        data: {
            name: 'Cairo Tech Solutions',
            taxId: '100234567',
            industry: 'Technology',
        },
    });
    console.log(`✓ Company: ${company.name} (${company.id})\n`);

    // ─────────────────────────────────────────────────────────────
    // 3. OFFICE LOCATIONS
    // ─────────────────────────────────────────────────────────────
    console.log('📍 Creating office locations...');
    const cairoHQ = await prisma.officeLocation.create({
        data: {
            companyId: company.id,
            name: 'Cairo HQ',
            latitude: 30.0444,
            longitude: 31.2357,
            fenceRadiusM: 100,
            shiftStartTime: '09:00',
            shiftEndTime: '17:00',
        },
    });

    const alexBranch = await prisma.officeLocation.create({
        data: {
            companyId: company.id,
            name: 'Alexandria Branch',
            latitude: 31.2001,
            longitude: 29.9187,
            fenceRadiusM: 100,
            shiftStartTime: '09:00',
            shiftEndTime: '17:00',
        },
    });
    console.log(`✓ Locations: ${cairoHQ.name}, ${alexBranch.name}\n`);

    // ─────────────────────────────────────────────────────────────
    // 4. DEPARTMENTS (no managers yet — we assign after employees exist)
    // ─────────────────────────────────────────────────────────────
    console.log('🗂  Creating departments...');
    const engineeringDept = await prisma.department.create({
        data: { companyId: company.id, name: 'Engineering' },
    });
    const hrDept = await prisma.department.create({
        data: { companyId: company.id, name: 'Human Resources' },
    });
    const salesDept = await prisma.department.create({
        data: { companyId: company.id, name: 'Sales' },
    });
    console.log(`✓ Departments: Engineering, Human Resources, Sales\n`);

    // ─────────────────────────────────────────────────────────────
    // 5. EMPLOYEES
    // Helper: auto-calculate netSalary from grossSalary
    // ─────────────────────────────────────────────────────────────
    function net(grossSalary) {
        return calculateNetSalary({ grossSalary }).netSalary;
    }

    console.log('👥 Creating employees...');

    // ── HR Admin ─────────────────────────────────────────────────
    const hrAdmin = await prisma.employee.create({
        data: {
            companyId: company.id,
            departmentId: hrDept.id,
            name: 'Sara Ahmed',
            nationalId: '29501011234561',
            grossSalary: 20000,
            netSalary: net(20000),
            jobTitle: 'HR Manager',
            hireDate: new Date('2022-01-01'),
            status: 'ACTIVE',
        },
    });

    // ── Engineering Manager ───────────────────────────────────────
    const engManager = await prisma.employee.create({
        data: {
            companyId: company.id,
            departmentId: engineeringDept.id,
            name: 'Omar Khaled',
            nationalId: '29001011234562',
            grossSalary: 25000,
            netSalary: net(25000),
            jobTitle: 'Engineering Manager',
            hireDate: new Date('2021-06-01'),
            status: 'ACTIVE',
        },
    });

    // ── Engineers ─────────────────────────────────────────────────
    const engineer1 = await prisma.employee.create({
        data: {
            companyId: company.id,
            departmentId: engineeringDept.id,
            name: 'Ahmed Hassan',
            nationalId: '29901011234563',
            grossSalary: 15000,
            netSalary: net(15000),
            jobTitle: 'Backend Engineer',
            hireDate: new Date('2023-03-01'),
            status: 'ACTIVE',
        },
    });

    const engineer2 = await prisma.employee.create({
        data: {
            companyId: company.id,
            departmentId: engineeringDept.id,
            name: 'Nour Eldin',
            nationalId: '29801011234564',
            grossSalary: 13000,
            netSalary: net(13000),
            jobTitle: 'Frontend Engineer',
            hireDate: new Date('2023-07-01'),
            status: 'ACTIVE',
        },
    });

    // ── Sales Employee ────────────────────────────────────────────
    const salesEmp = await prisma.employee.create({
        data: {
            companyId: company.id,
            departmentId: salesDept.id,
            name: 'Mona Tarek',
            nationalId: '29701011234565',
            grossSalary: 10000,
            netSalary: net(10000),
            jobTitle: 'Sales Representative',
            hireDate: new Date('2024-01-01'),
            status: 'ACTIVE',
        },
    });

    // ── Terminated Employee (for testing edge cases) ──────────────
    const terminated = await prisma.employee.create({
        data: {
            companyId: company.id,
            departmentId: engineeringDept.id,
            name: 'Karim Samir',
            nationalId: '29601011234566',
            grossSalary: 12000,
            netSalary: net(12000),
            jobTitle: 'Junior Developer',
            hireDate: new Date('2023-01-01'),
            status: 'TERMINATED',
        },
    });

    console.log('✓ Employees created\n');

    // ─────────────────────────────────────────────────────────────
    // 6. ASSIGN DEPARTMENT MANAGERS
    // ─────────────────────────────────────────────────────────────
    console.log('👔 Assigning department managers...');
    await prisma.department.update({
        where: { id: engineeringDept.id },
        data: { managerId: engManager.id },
    });
    await prisma.department.update({
        where: { id: hrDept.id },
        data: { managerId: hrAdmin.id },
    });
    console.log('✓ Managers assigned\n');

    // ─────────────────────────────────────────────────────────────
    // 7. USER ACCOUNTS
    // ─────────────────────────────────────────────────────────────
    console.log('🔐 Creating user accounts...');
    const passwordHash = await bcrypt.hash('password123', 12);

    await prisma.user.createMany({
        data: [
            {
                employeeId: hrAdmin.id,
                email: 'sara.ahmed@cairotech.com',
                passwordHash,
                role: 'HR_ADMIN',
            },
            {
                employeeId: engManager.id,
                email: 'omar.khaled@cairotech.com',
                passwordHash,
                role: 'MANAGER',
            },
            {
                employeeId: engineer1.id,
                email: 'ahmed.hassan@cairotech.com',
                passwordHash,
                role: 'EMPLOYEE',
            },
            {
                employeeId: engineer2.id,
                email: 'nour.eldin@cairotech.com',
                passwordHash,
                role: 'EMPLOYEE',
            },
            {
                employeeId: salesEmp.id,
                email: 'mona.tarek@cairotech.com',
                passwordHash,
                role: 'EMPLOYEE',
            },
        ],
    });
    console.log('✓ User accounts created\n');

    // ─────────────────────────────────────────────────────────────
    // 8. ATTENDANCE — simulate last month's records
    //    Ahmed: present all 22 working days, late a few times
    //    Nour: absent 3 days, late a few times
    //    Mona: present every day, never late
    // ─────────────────────────────────────────────────────────────
    console.log('📅 Seeding attendance records...');

    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();      // 1-based
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    // Generate working days for last month (Mon–Fri only)
    function getWorkingDays(month, year) {
        const days = [];
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month - 1, d);
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) days.push(date); // skip Sat & Sun
        }
        return days;
    }

    const workingDays = getWorkingDays(lastMonth, lastMonthYear);

    // Helper to build a clock-in datetime on a given day
    function clockInAt(date, hour, minute) {
        const d = new Date(date);
        d.setHours(hour, minute, 0, 0);
        return d;
    }

    function clockOutAt(date, hour, minute) {
        const d = new Date(date);
        d.setHours(hour, minute, 0, 0);
        return d;
    }

    // Ahmed — present every day, late on 3 days (15, 30, 45 min late)
    const ahmedAttendance = workingDays.map((day, i) => {
        const lateMinutes = i === 3 ? 15 : i === 7 ? 30 : i === 12 ? 45 : 0;
        const clockInHour = lateMinutes > 0 ? 9 : 9;
        const clockInMin = lateMinutes;
        return {
            employeeId: engineer1.id,
            locationId: cairoHQ.id,
            clockIn: clockInAt(day, clockInHour, clockInMin),
            clockOut: clockOutAt(day, 17, 0),
            latitude: 30.0444,
            longitude: 31.2357,
            isValid: true,
            lateMinutes,
        };
    });

    // Nour — absent on days 5, 10, 15 (index 4, 9, 14), late on 2 days
    const nourAttendance = workingDays
        .filter((_, i) => i !== 4 && i !== 9 && i !== 14) // skip 3 days = absent
        .map((day, i) => {
            const lateMinutes = i === 2 ? 20 : i === 6 ? 10 : 0;
            return {
                employeeId: engineer2.id,
                locationId: cairoHQ.id,
                clockIn: clockInAt(day, 9, lateMinutes),
                clockOut: clockOutAt(day, 17, 0),
                latitude: 30.0444,
                longitude: 31.2357,
                isValid: true,
                lateMinutes,
            };
        });

    // Mona — perfect attendance, always on time
    const monaAttendance = workingDays.map(day => ({
        employeeId: salesEmp.id,
        locationId: cairoHQ.id,
        clockIn: clockInAt(day, 9, 0),
        clockOut: clockOutAt(day, 17, 0),
        latitude: 30.0444,
        longitude: 31.2357,
        isValid: true,
        lateMinutes: 0,
    }));

    await prisma.attendance.createMany({
        data: [...ahmedAttendance, ...nourAttendance, ...monaAttendance],
    });
    console.log(`✓ Attendance: ${ahmedAttendance.length + nourAttendance.length + monaAttendance.length} records\n`);

    // ─────────────────────────────────────────────────────────────
    // 9. ADVANCES
    //    Ahmed: approved advance of 3,000 EGP (will be deducted in payroll)
    //    Nour: pending advance of 2,000 EGP (not yet decided)
    //    Mona: rejected advance
    // ─────────────────────────────────────────────────────────────
    console.log('💸 Creating advances...');

    await prisma.advance.create({
        data: {
            employeeId: engineer1.id,
            approvedBy: engManager.id,
            amount: 3000,
            reason: 'Medical expenses',
            status: 'APPROVED',
            requestedAt: new Date(lastMonthYear, lastMonth - 1, 10),
            decidedAt: new Date(lastMonthYear, lastMonth - 1, 11),
        },
    });

    await prisma.advance.create({
        data: {
            employeeId: engineer2.id,
            amount: 2000,
            reason: 'Rent payment',
            status: 'PENDING',
            requestedAt: new Date(lastMonthYear, lastMonth - 1, 15),
        },
    });

    await prisma.advance.create({
        data: {
            employeeId: salesEmp.id,
            approvedBy: hrAdmin.id,
            amount: 1500,
            reason: 'Travel expenses',
            status: 'REJECTED',
            requestedAt: new Date(lastMonthYear, lastMonth - 1, 5),
            decidedAt: new Date(lastMonthYear, lastMonth - 1, 6),
        },
    });

    console.log('✓ Advances created\n');

    // ─────────────────────────────────────────────────────────────
    // 10. PRINT SUMMARY
    // ─────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════');
    console.log('✅ Seed complete! Here is your test data:\n');

    console.log('🏢 Company:');
    console.log(`   Cairo Tech Solutions (ID: ${company.id})\n`);

    console.log('📍 Locations:');
    console.log(`   Cairo HQ       (ID: ${cairoHQ.id})`);
    console.log(`   Alex Branch    (ID: ${alexBranch.id})\n`);

    console.log('🗂  Departments:');
    console.log(`   Engineering    (ID: ${engineeringDept.id})`);
    console.log(`   Human Resources(ID: ${hrDept.id})`);
    console.log(`   Sales          (ID: ${salesDept.id})\n`);

    console.log('👥 Employees & Logins (all passwords: password123):');
    console.log(`   sara.ahmed@cairotech.com    → HR_ADMIN  | gross: 20,000 EGP`);
    console.log(`   omar.khaled@cairotech.com   → MANAGER   | gross: 25,000 EGP`);
    console.log(`   ahmed.hassan@cairotech.com  → EMPLOYEE  | gross: 15,000 EGP (advance: 3,000 APPROVED)`);
    console.log(`   nour.eldin@cairotech.com    → EMPLOYEE  | gross: 13,000 EGP (advance: 2,000 PENDING, 3 absent days)`);
    console.log(`   mona.tarek@cairotech.com    → EMPLOYEE  | gross: 10,000 EGP (perfect attendance)`);
    console.log(`   karim.samir (no login)      → TERMINATED\n`);

    console.log('📋 Next steps to test the full flow:');
    console.log('   1. POST /api/auth/login → get token for any user');
    console.log('   2. POST /api/attendance/deductions/calculate { month, year }');
    console.log('   3. GET  /api/attendance/deductions?month=X&year=Y → review');
    console.log('   4. POST /api/payroll/run { month, year }');
    console.log('   5. GET  /api/payroll/runs/:id → poll until DONE');
    console.log('   6. GET  /api/payroll/runs/:id/payslips → see results');
    console.log('═══════════════════════════════════════════════\n');
}

main()
    .catch(err => {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });