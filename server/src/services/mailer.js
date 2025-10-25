import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

// Method for sending an email to a user for email verification
export async function sendVerificationEmail(email, token, userId) {

    const verifyUrl = `${process.env.API_URL}/api/auth/verify-email?token=${token}&id=${userId}`;

    return await resend.emails.send({
        from: "RoommateLink <onboarding@resend.dev>",
        to: email,
        subject: "Verify your email",
        html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">
        <h1>Hi!</h1>
        <p>Click the button below to verify your email.</p>
        <p><a href="${verifyUrl}"
              style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;
                     text-decoration:none;border-radius:8px;">Verify Email</a></p>
        <p>If the button doesn't work, copy this URL:</p>
        <p style="word-break:break-all">${verifyUrl}</p>
      </div>
    `,
    });
}