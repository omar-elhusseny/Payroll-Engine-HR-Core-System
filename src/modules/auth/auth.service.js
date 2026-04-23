import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma/client.js';


export async function registerUser({ employeeID, email, password, role }) {
    // make sure that the employee exists
    const employee = await prisma.employee.findUnique({
        where: { id: employeeID }
    })

    if (!employee) {
        const err = new Error('Employee not found');
        err.status = 404;
        throw err;
    }

    // if the email already used or not 
    const existingUser = await prisma.user.findUnique({ where: { email } })

    if (existingUser) {
        const err = new Error('Email already registered');
        err.status = 409;
        throw err;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
        data: { employeeId, email, passwordHash, role: role || 'EMPLOYEE' },
        select: {
            id: true,
            email: true,
            role: true,
            employeeId: true,
            createdAt: true,
        }
    })

    return user;
}

export async function loginUser({ email, password }) {
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            employee: {
                select: { companyId: true, name: true }
            }
        }
    })

    // for generic errors
    const invalidErr = new Error('Invalid email or password');
    invalidErr.status = 401;

    if (!user) throw invalidErr;

    // compare the plain text password with the stored hashed password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) throw invalidErr;

    const token = jwt.sign({
        userId: user.id,
        employeeId: user.employeeId,
        companyId: user.employee.companyId,
        role: user.role,
    }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" })

    // update the last login
    prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
    }).catch(() => { })

    return {
        token,
        data: {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.employee.name,
            companyId: user.employee.companyId,
        }
    }
} 