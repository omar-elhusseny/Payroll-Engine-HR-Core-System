// ─────────────────────────────────────────────────────────────
// haversineDistance
// Returns the distance in meters between two GPS coordinates.
// Used to validate whether an employee is within the office fence.
// ─────────────────────────────────────────────────────────────
export function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────
// isWithinFence
// Returns whether the employee's coordinates fall within the
// office location's geo-fence radius.
// ─────────────────────────────────────────────────────────────
export function isWithinFence({ employeeLat, employeeLon, officeLat, officeLon, radiusMeters }) {
    const distance = haversineDistance(employeeLat, employeeLon, officeLat, officeLon);
    return {
        isValid: distance <= radiusMeters,
        distance: Math.round(distance), // metres, rounded
    };
}

// ─────────────────────────────────────────────────────────────
// calculateLateMinutes
// Compares the employee's clock-in time against the shift start.
// shiftStartTime is "HH:MM" (e.g. "09:00").
// Returns 0 if on time or early.
// ─────────────────────────────────────────────────────────────
export function calculateLateMinutes(clockIn, shiftStartTime) {
    const [shiftHour, shiftMinute] = shiftStartTime.split(':').map(Number);

    // Build the shift start as a Date on the same calendar day as clockIn
    const shiftStart = new Date(clockIn);
    shiftStart.setHours(shiftHour, shiftMinute, 0, 0);

    const diffMs = clockIn - shiftStart;
    const diffMinutes = Math.floor(diffMs / 60000);

    return Math.max(0, diffMinutes); // negative means early — treat as 0
}