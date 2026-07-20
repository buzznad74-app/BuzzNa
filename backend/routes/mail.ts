/**
 * BuzzNa D74 - Mailing Routes
 * Handles business onboarding emails and customer notifications
 */

import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { Business, User } from '../types';

const router = Router();

// Initialize email transporter (using Brevo/Sendinblue API)
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS
  }
});

interface OnboardingEmailPayload {
  business: Business;
  owner: User;
  recipientEmail: string;
  language: 'EN' | 'SW';
}

interface CustomerWelcomePayload {
  tenantId: string;
  customerName: string;
  customerEmail: string;
  phoneNumber: string;
  language: 'EN' | 'SW';
}

/**
 * POST /api/mail/onboarding
 * Send welcome email to new business owner
 */
router.post('/onboarding', async (req: Request, res: Response) => {
  try {
    const { business, owner, recipientEmail, language }: OnboardingEmailPayload = req.body;

    if (!recipientEmail || !business) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const subject = language === 'SW'
      ? `Karibu kwenye BuzzNa D74 - ${business.tradeName}`
      : `Welcome to BuzzNa D74 - ${business.tradeName}`;

    const htmlContent = language === 'SW'
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">BuzzNa D74</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Operesheni ya Biashara Mpya</p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">Karibu, ${owner.username}!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 15px 0;">
              Usajili wa ${business.tradeName} umakamilika kwa mafanikio. Biashara yako sasa iko online na iko tayari kwa operesheni.
            </p>

            <div style="background: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; border-radius: 4px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af; font-size: 16px;">Maelezo ya Mkakati:</h3>
              <ul style="color: #1e40af; margin: 10px 0;">
                <li><strong>Jina la Biashara:</strong> ${business.tradeName}</li>
                <li><strong>Ngazi:</strong> ${business.industry}</li>
                <li><strong>Hesabu Nchi:</strong> ${business.country}</li>
                <li><strong>Jaribu Siku:</strong> 14</li>
              </ul>
            </div>

            <p style="color: #4b5563; line-height: 1.6; margin: 15px 0;">
              Unaweza sasa kuingia kwenye software ya BuzzNa D74 kwa kutumia jina lako na neno la siri. Mfumo wetu unafanya kazi offline - takwimu zako ni salama hata bila mtandao.
            </p>

            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.APP_URL || 'https://buzznad74.vercel.app'}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Ingia kwenye Dashibohodi
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

            <p style="color: #6b7280; font-size: 12px; margin: 10px 0;">
              <strong>Msaada:</strong> support@buzznad74.com | WhatsApp: +254790435584
            </p>
          </div>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">BuzzNa D74</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Cloud POS Operating System</p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">Welcome, ${owner.username}!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 15px 0;">
              Your registration for ${business.tradeName} has been completed successfully. Your business is now online and ready for operations.
            </p>

            <div style="background: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; border-radius: 4px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af; font-size: 16px;">Business Details:</h3>
              <ul style="color: #1e40af; margin: 10px 0;">
                <li><strong>Trade Name:</strong> ${business.tradeName}</li>
                <li><strong>Industry:</strong> ${business.industry}</li>
                <li><strong>Accounting Currency:</strong> ${business.currency}</li>
                <li><strong>Trial Period:</strong> 14 days</li>
              </ul>
            </div>

            <p style="color: #4b5563; line-height: 1.6; margin: 15px 0;">
              You can now log into the BuzzNa D74 software using your username and password. Our system works offline - your data is secure even without internet connectivity.
            </p>

            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.APP_URL || 'https://buzznad74.vercel.app'}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Access Your Dashboard
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

            <p style="color: #6b7280; font-size: 12px; margin: 10px 0;">
              <strong>Support:</strong> support@buzznad74.com | WhatsApp: +254790435584
            </p>
          </div>
        </div>
      `;

    await transporter.sendMail({
      from: process.env.BREVO_FROM_EMAIL || 'noreply@buzznad74.com',
      to: recipientEmail,
      subject,
      html: htmlContent
    });

    console.log(`[Mail] Onboarding email sent to ${recipientEmail}`);
    return res.status(200).json({ success: true, message: 'Onboarding email sent' });
  } catch (err: any) {
    console.error('[Mail] Onboarding email failed:', err);
    return res.status(500).json({ error: err.message || 'Failed to send onboarding email' });
  }
});

/**
 * POST /api/mail/customer-welcome
 * Send welcome notification to new customer
 */
router.post('/customer-welcome', async (req: Request, res: Response) => {
  try {
    const { tenantId, customerName, customerEmail, phoneNumber, language }: CustomerWelcomePayload = req.body;

    if (!customerEmail || !customerName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const subject = language === 'SW'
      ? `Karibu kama Mteja wa BuzzNa D74`
      : `Welcome as a BuzzNa D74 Customer`;

    const htmlContent = language === 'SW'
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
          <h2 style="color: #1f2937;">Karibu, ${customerName}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 15px 0;">
            Umefungwa kama mteja mwenye akaunti kwenye ofisi yenye BuzzNa D74. Mfumo unafanya kazi kiotomatiki na hatari kwa kila walaji.
          </p>
          <div style="background: #ecfdf5; padding: 15px; border-left: 4px solid #059669; border-radius: 4px; margin: 20px 0;">
            <p style="color: #047857; margin: 0;">
              <strong>Jina:</strong> ${customerName}<br>
              <strong>Simu:</strong> ${phoneNumber}
            </p>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin: 15px 0;">
            Asante kwa kuwa sehemu ya jamii yetu!
          </p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
          <h2 style="color: #1f2937;">Welcome, ${customerName}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 15px 0;">
            You have been registered as a credited customer at a BuzzNa D74 store. Our system works automatically and securely for every customer.
          </p>
          <div style="background: #ecfdf5; padding: 15px; border-left: 4px solid #059669; border-radius: 4px; margin: 20px 0;">
            <p style="color: #047857; margin: 0;">
              <strong>Name:</strong> ${customerName}<br>
              <strong>Phone:</strong> ${phoneNumber}
            </p>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin: 15px 0;">
            Thank you for being part of our community!
          </p>
        </div>
      `;

    await transporter.sendMail({
      from: process.env.BREVO_FROM_EMAIL || 'noreply@buzznad74.com',
      to: customerEmail,
      subject,
      html: htmlContent
    });

    console.log(`[Mail] Customer welcome email sent to ${customerEmail}`);
    return res.status(200).json({ success: true, message: 'Customer welcome email sent' });
  } catch (err: any) {
    console.error('[Mail] Customer welcome email failed:', err);
    return res.status(500).json({ error: err.message || 'Failed to send customer welcome email' });
  }
});

export default router;