// /src/lib/mailer.js
// Nodemailer Email Verification & Two-Factor Authentication Service

import nodemailer from 'nodemailer';

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) {
    return transporterPromise;
  }

  transporterPromise = (async () => {
    const host = process.env.EMAIL_SERVER_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const user = process.env.EMAIL_SERVER_USER || process.env.SMTP_USER;
    let pass = process.env.EMAIL_SERVER_PASSWORD || process.env.SMTP_PASS;
    const port = parseInt(process.env.EMAIL_SERVER_PORT || process.env.SMTP_PORT || '587', 10);

    if (user && pass) {
      if (typeof pass === 'string') {
        pass = pass.trim().replace(/\s+/g, '');
      }

      // Dedicated Gmail service transport for maximum reliability with Gmail App Passwords
      if (host.includes('gmail.com') || (typeof user === 'string' && user.includes('@gmail.com'))) {
        console.log(`✓ Nodemailer: Configuring Gmail service transport for: ${user}`);
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user,
            pass,
          },
        });
      }

      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    }

    // Ephemeral fallback for local testing if no credentials are configured
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  })();

  return transporterPromise;
}

export async function sendVerificationEmail(toEmail, username, verificationCode) {
  const transporter = await getTransporter();
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER || '"Connected Security" <no-reply@connected-security.local>';

  const mailOptions = {
    from: fromEmail,
    to: toEmail,
    subject: 'Connected: Email Verification Code',
    text: `Hello ${username},\n\nYour account email verification code is: ${verificationCode}\n\nThis code expires in 15 minutes.\n\nThank you,\nConnected Security Team`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background-color: #020617; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #6366f1; margin: 0; font-size: 22px;">Connected Platform</h2>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Account Email Verification</p>
        </div>
        <div style="background-color: #0f172a; padding: 20px; border-radius: 8px; border: 1px solid #334155;">
          <p style="color: #cbd5e1; font-size: 14px; margin-top: 0;">Hello <strong>${username}</strong>,</p>
          <p style="color: #94a3b8; font-size: 13px;">Thank you for registering. Here is your 6-digit account verification code:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 6px; border-radius: 8px;">
              ${verificationCode}
            </span>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">This code expires in 15 minutes. If you did not request this, please ignore this email.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Nodemailer: Verification email sent to ${toEmail} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('✗ Nodemailer send error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendTwoFactorEmail(toEmail, username, twoFactorCode) {
  const transporter = await getTransporter();
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER || '"Connected Security" <no-reply@connected-security.local>';

  const mailOptions = {
    from: fromEmail,
    to: toEmail,
    subject: 'Connected: Your 2-Step Login Code (OTP)',
    text: `Hello ${username},\n\nYour 2-Step Authentication login code (OTP) is: ${twoFactorCode}\n\nThis code expires in 5 minutes.\n\nThank you,\nConnected Security Team`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background-color: #020617; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #10b981; margin: 0; font-size: 22px;">Connected Security</h2>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Two-Step Authentication (2FA)</p>
        </div>
        <div style="background-color: #0f172a; padding: 20px; border-radius: 8px; border: 1px solid #334155;">
          <p style="color: #cbd5e1; font-size: 14px; margin-top: 0;">Hello <strong>${username}</strong>,</p>
          <p style="color: #94a3b8; font-size: 13px;">A sign-in request was made for your account. Please enter the following 6-digit one-time passcode (OTP) to complete login:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #ffffff; font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 6px; border-radius: 8px;">
              ${twoFactorCode}
            </span>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">This code is valid for 5 minutes. Never share this code with anyone.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Nodemailer: 2FA OTP sent to ${toEmail} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('✗ Nodemailer 2FA send error:', error);
    return { success: false, error: error.message };
  }
}
