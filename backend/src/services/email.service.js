const nodemailer = require('nodemailer');
const env = require('../config/env');
const auditService = require('./audit.service');

// Map role code to styled badge details
const ROLE_BADGES = {
  ADMIN: {
    label: 'System Administrator',
    bg: '#fef2f2',
    color: '#991b1b'
  },
  FLEET_MANAGER: {
    label: 'Fleet Manager',
    bg: '#eff6ff',
    color: '#1e40af'
  },
  DISPATCHER: {
    label: 'Dispatcher',
    bg: '#fff7ed',
    color: '#c2410c'
  },
  DRIVER: {
    label: 'Driver',
    bg: '#f0fdf4',
    color: '#15803d'
  },
  SAFETY_OFFICER: {
    label: 'Safety Officer',
    bg: '#fdf2f8',
    color: '#9d174d'
  },
  FINANCIAL_ANALYST: {
    label: 'Financial Analyst',
    bg: '#faf5ff',
    color: '#6b21a8'
  }
};

/**
 * Exposes methods to format and dispatch emails.
 */
const emailService = {
  /**
   * Generates and dispatches a welcome/onboarding email to a newly created user.
   */
  sendWelcomeEmail: async ({ fullName, email, password, role, adminUser, createdUserId }) => {
    const badge = ROLE_BADGES[role.toUpperCase()] || { label: role, bg: '#f1f5f9', color: '#475569' };
    const loginUrl = `${env.FRONTEND_URL}/login`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to TransitOps</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #334155;
          }
          .email-wrapper {
            width: 100%;
            background-color: #f8fafc;
            padding: 40px 0;
          }
          .email-container {
            max-width: 580px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            border-top: 4px solid #f97316;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            overflow: hidden;
          }
          .email-header {
            padding: 32px 32px 20px 32px;
            border-bottom: 1px solid #f1f5f9;
          }
          .email-body {
            padding: 32px;
          }
          .email-footer {
            padding: 24px 32px;
            background-color: #f8fafc;
            border-top: 1px solid #f1f5f9;
            text-align: center;
            font-size: 0.8rem;
            color: #64748b;
          }
          .brand-logo {
            font-size: 1.35rem;
            font-weight: 800;
            color: #0f172a;
          }
          .brand-logo span {
            color: #f97316;
          }
          h1 {
            font-size: 1.5rem;
            font-weight: 800;
            color: #0f172a;
            margin-top: 0;
            margin-bottom: 16px;
          }
          p {
            font-size: 0.95rem;
            line-height: 1.6;
            margin-top: 0;
            margin-bottom: 16px;
            color: #475569;
          }
          .credentials-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 24px;
            margin: 24px 0;
          }
          .credentials-table {
            width: 100%;
            border-collapse: collapse;
          }
          .credentials-table td {
            padding: 8px 0;
            font-size: 0.9rem;
          }
          .credentials-label {
            font-weight: 600;
            color: #475569;
            width: 130px;
          }
          .credentials-value {
            color: #0f172a;
            font-family: monospace;
            font-size: 0.95rem;
          }
          .role-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            background-color: ${badge.bg};
            color: ${badge.color};
          }
          .btn-primary {
            display: inline-block;
            padding: 12px 24px;
            background-color: #f97316;
            color: #ffffff !important;
            text-decoration: none;
            font-size: 0.95rem;
            font-weight: 700;
            border-radius: 6px;
            margin-top: 8px;
            text-align: center;
          }
          .btn-primary:hover {
            background-color: #ea580c;
          }
        </style>
      </head>
      <body>
        <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <table class="email-container" cellpadding="0" cellspacing="0">
                <!-- Header -->
                <tr>
                  <td class="email-header">
                    <div class="brand-logo">Transit<span>Ops</span></div>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td class="email-body">
                    <h1>Welcome, ${fullName}!</h1>
                    <p>Hello ${fullName},</p>
                    <p>Welcome to TransitOps. Your account has been created successfully by the System Administrator.</p>
                    <p>Below are your login credentials. For security purposes, please log in and change your password immediately.</p>

                    <div class="credentials-box">
                      <table class="credentials-table">
                        <tr>
                          <td class="credentials-label">Name:</td>
                          <td style="color: #0f172a; font-weight: 600;">${fullName}</td>
                        </tr>
                        <tr>
                          <td class="credentials-label">Email:</td>
                          <td style="color: #0f172a;">${email}</td>
                        </tr>
                        <tr>
                          <td class="credentials-label">Assigned Role:</td>
                          <td><span class="role-badge">${badge.label}</span></td>
                        </tr>
                        <tr>
                          <td class="credentials-label">Temp Password:</td>
                          <td class="credentials-value" style="font-weight: 700; color: #b91c1c;">${password}</td>
                        </tr>
                      </table>
                    </div>

                    <p style="margin-bottom: 24px;">Please click the button below to access the login portal and enter your credentials.</p>
                    <a href="${loginUrl}" target="_blank" class="btn-primary">Log In to TransitOps</a>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td class="email-footer">
                    <p style="margin: 0; font-size: 0.75rem;">If you did not expect this account, please contact your administrator.</p>
                    <p style="margin: 8px 0 0 0; font-size: 0.75rem;">&copy; ${new Date().getFullYear()} TransitOps Team. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Audit logging parameters
    const auditMeta = {
      actor: adminUser || { id: '00000000-0000-0000-0000-000000000000', email: 'system@transitops.app', role: 'SYSTEM' },
      module: 'Users',
      entityType: 'User',
      entityId: createdUserId
    };

    // If SMTP credentials are not configured, perform console log fallback
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      console.log('╔════════════════════════════════════════════════════════════════════════╗');
      console.log('║                      TRANSITOPS WELCOME EMAIL LOG                      ║');
      console.log('╚════════════════════════════════════════════════════════════════════════╝');
      console.log(`To: ${email}`);
      console.log(`Subject: Welcome to TransitOps - Your Account Has Been Created`);
      console.log(`Role: ${badge.label}`);
      console.log(`Temporary Password: ${password}`);
      console.log(`Login URL: ${loginUrl}`);
      console.log('──────────────────────────────────────────────────────────────────────────');
      console.log('Email HTML contents rendered successfully in console.');
      console.log('╚════════════════════════════════════════════════════════════════════════╝');

      // Log successful audit entry for console log delivery
      await auditService.logAction({
        ...auditMeta,
        action: 'WELCOME_EMAIL_SENT',
        description: `Welcome email mock-delivered successfully to ${email} (console fallback)`
      });

      return { success: true, consoleFallback: true };
    }

    // SMTP Configuration Transporter
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });

    try {
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to: email,
        subject: 'Welcome to TransitOps - Your Account Has Been Created',
        text: `Hello ${fullName},\n\nWelcome to TransitOps.\n\nYour account has been created successfully by the System Administrator.\n\nName: ${fullName}\nEmail: ${email}\nTemporary Password: ${password}\nAssigned Role: ${badge.label}\nLogin URL: ${loginUrl}\n\nPlease change your password immediately after logging in.\n\nRegards,\nTransitOps Team`,
        html: htmlBody
      });

      await auditService.logAction({
        ...auditMeta,
        action: 'WELCOME_EMAIL_SENT',
        description: `Welcome email sent successfully to ${email}`
      });

      return { success: true };
    } catch (sendErr) {
      console.error('[EMAIL] Failed to dispatch SMTP mail:', sendErr.message);

      await auditService.logAction({
        ...auditMeta,
        action: 'WELCOME_EMAIL_FAILED',
        status: 'FAILURE',
        description: `Failed to send welcome email to ${email}: ${sendErr.message}`
      });

      throw sendErr;
    }
  }
};

module.exports = emailService;
