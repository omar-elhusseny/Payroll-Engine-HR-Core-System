import Decimal from 'decimal.js';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// Defined once here. When the government updates brackets,
// you change numbers in ONE place only.
// ─────────────────────────────────────────────────────────────


// ETA Progressive Income Tax Brackets (Annual, in EGP) — 2026
// Source: Egyptian Tax Authority (latest amendments)
// const TAX_BRACKETS = [
//     { min: 0, max: 40000, rate: 0.000 }, // exempt
//     { min: 40000, max: 55000, rate: 0.10 },
//     { min: 55000, max: 70000, rate: 0.15 },
//     { min: 70000, max: 200000, rate: 0.20 },
//     { min: 200000, max: 400000, rate: 0.225 },
//     { min: 400000, max: 1200000, rate: 0.25 },
//     { min: 1200000, max: Infinity, rate: 0.275 },
// ];

// ETA Progressive Income Tax Brackets (Annual, in EGP) — 2024
// Source: Egyptian Tax Authority, Law No. 91 of 2005 + amendments
const TAX_BRACKETS = [
    { min: 0, max: 15000, rate: 0.000 }, // exempt
    { min: 15000, max: 30000, rate: 0.025 },
    { min: 30000, max: 45000, rate: 0.100 },
    { min: 45000, max: 60000, rate: 0.150 },
    { min: 60000, max: 200000, rate: 0.200 },
    { min: 200000, max: 400000, rate: 0.225 },
    { min: 400000, max: Infinity, rate: 0.250 },
];

// Social Insurance Rates — Egyptian Social Insurance Law No. 148 of 2019
const SOCIAL_INSURANCE = {
    employeeRate: 0.11,   // employee pays 11% of insurable income
    employerRate: 0.18,   // company pays 18% (needed for Form 2)
    minInsurableIncome: 1800,  // EGP/month floor
    maxInsurableIncome: 10500, // EGP/month ceiling — contributions capped here
};

// ─────────────────────────────────────────────────────────────
// calculateSocialInsurance
// Insurance is calculated on a capped "insurable income",
// not on the raw base salary. This is the legal definition.
// ─────────────────────────────────────────────────────────────
export function calculateSocialInsurance(grossSalary) {
    const salary = new Decimal(grossSalary);

    // Clamp between floor and ceiling
    const insurable = Decimal.max(
        SOCIAL_INSURANCE.minInsurableIncome,
        Decimal.min(salary, SOCIAL_INSURANCE.maxInsurableIncome)
    );

    return {
        employeeShare: insurable.times(SOCIAL_INSURANCE.employeeRate).toDecimalPlaces(2),
        employerShare: insurable.times(SOCIAL_INSURANCE.employerRate).toDecimalPlaces(2),
        insurableIncome: insurable,
    };
}

// ─────────────────────────────────────────────────────────────
// calculateAnnualTax
// Progressive tax on ANNUAL taxable income.
// Each bracket is taxed independently — not cumulative rate.
//
// Example: annual taxable income = 80,000 EGP
//   Bracket 0–15k:    0%   → 0
//   Bracket 15k–30k: 2.5%  → 375
//   Bracket 30k–45k: 10%   → 1,500
//   Bracket 45k–60k: 15%   → 2,250
//   Bracket 60k–80k: 20%   → 4,000
//   Total annual tax:       8,125 EGP
//   Monthly tax:            677.08 EGP
// ─────────────────────────────────────────────────────────────
export function calculateAnnualTax(annualTaxableIncome) {
    const income = new Decimal(annualTaxableIncome);
    let totalTax = new Decimal(0);

    for (const bracket of TAX_BRACKETS) {
        if (income.lte(bracket.min)) break;

        const taxableInBracket = Decimal.min(income, bracket.max).minus(bracket.min);
        totalTax = totalTax.plus(taxableInBracket.times(bracket.rate));
    }

    return totalTax.toDecimalPlaces(2);
}

// ─────────────────────────────────────────────────────────────
// calculateNetSalary
// The main function. Takes gross monthly inputs, returns the
// full payslip breakdown.
//
// Order matters:
//   1. Calculate social insurance on gross salary
//   2. Subtract insurance from gross to get taxable base
//   3. Annualize taxable base, run through tax brackets
//   4. Calculate annual tax after cutting employee insurance share from gross
//   5. Divide annual tax by 12 for monthly tax
//   6. Subtract everything + advances from gross
// ─────────────────────────────────────────────────────────────
export function calculateNetSalary({
    grossSalary,
    advances = 0,   // approved salaf deductions
    deductions = 0,   // any other deductions (e.g. penalties, late deductions)
}) {
    const gross = new Decimal(grossSalary);
    const insurance = calculateSocialInsurance(gross);

    // Taxable base = gross minus employee insurance share
    const taxableMonthly = gross.minus(insurance.employeeShare);
    const taxableAnnual = taxableMonthly.times(12);

    const annualTax = calculateAnnualTax(taxableAnnual);
    const monthlyTax = annualTax.dividedBy(12).toDecimalPlaces(2);

    // Net salary - Employee salary after cutting insurances and taxes
    let netSalary = gross.minus(insurance.employeeShare).minus(monthlyTax).toDecimalPlaces(2);

    // If there are deductions, subtract them before delivering the final salary to the user
    netSalary = netSalary.minus(new Decimal(advances)).minus(new Decimal(deductions)).toDecimalPlaces(2);

    return {
        // ── Inputs ──────────────────────────────────────────────
        grossSalary: gross.toDecimalPlaces(2),

        // ── Legal deductions (affect tax base) ──────────────────
        insuranceEmployee: insurance.employeeShare,   // 11% of insurable
        insuranceEmployer: insurance.employerShare,   // 18% — stored for Form 2
        taxDeduction: monthlyTax,

        // ── Post-net deductions (do NOT affect tax) ─────────────
        advanceDeduction: new Decimal(advances).toDecimalPlaces(2),
        otherDeductions: new Decimal(deductions).toDecimalPlaces(2),

        // ── Legal net (gross − insurance − tax - deducitons - advances) ─────────────────
        netSalary
    };
}

// ─────────────────────────────────────────────────────────────
// verifyCalculation
// Public compliance audit tool.
// Takes a company's gross salary and their claimed net,
// returns whether they are calculating correctly.
// This is the "free compliance check" from your GTM strategy.
// ─────────────────────────────────────────────────────────────
export function verifyCalculation({ grossSalary, claimedNetSalary }) {
    const result = calculateNetSalary({ grossSalary });
    const claimed = new Decimal(claimedNetSalary);
    const diff = claimed.minus(result.netSalary).abs();

    return {
        isCompliant: diff.lte(1),       // 1 EGP rounding tolerance
        expectedNet: result.netSalary,
        claimedNet: claimed,
        difference: diff,
        breakdown: result,
    };
}