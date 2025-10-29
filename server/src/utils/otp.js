import crypto from "crypto";

// Generate a secure random 6-digit OTP
export function generateOTP() {
    return crypto.randomInt(100000, 999999);
}

// Hash the OTP for storing in the database
export async function hashOTP(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
}

// Verifying a raw token matches the stored hash
export async function verifyOTP(raw, hash) {
    return crypto.createHash("sha256").update(raw).digest("hex") === hash;
}