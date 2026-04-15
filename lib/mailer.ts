import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  await transporter.sendMail({
    from,
    to,
    subject: 'Verify your email address',
    html: `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:32px 16px;background:#f5f0e8;font-family:Arial,sans-serif;color:#171717;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;padding:40px;box-shadow:0 20px 50px rgba(17,67,15,0.08);">
            <tr>
              <td>
                <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.1;color:#11430F;">Verify your email</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;">
                  Thanks for creating your account. Please confirm that this email address belongs to you before signing in.
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${verifyUrl}" style="display:inline-block;border-radius:16px;background:#11430F;color:#e4f386;text-decoration:none;font-weight:700;padding:14px 24px;">Verify Email</a>
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
                  This verification link expires in 24 hours. If you didn&apos;t create this account, you can ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await transporter.sendMail({
    from,
    to,
    subject: 'Reset your password',
    html: `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:32px 16px;background:#f5f0e8;font-family:Arial,sans-serif;color:#171717;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;padding:40px;box-shadow:0 20px 50px rgba(17,67,15,0.08);">
            <tr>
              <td>
                <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.1;color:#11430F;">Reset your password</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;">
                  We received a request to reset your password. This secure link expires in <strong>1 hour</strong>.
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${resetUrl}" style="display:inline-block;border-radius:16px;background:#11430F;color:#e4f386;text-decoration:none;font-weight:700;padding:14px 24px;">Reset Password</a>
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  });
}
