import { transporter } from '../../config/mail.config.js';
import { config } from '../../config/env.config.js';

const FROM_EMAIL = `"SkyBreathHRM System" <${config.mail.user}>`;

export default async function sendMail(to, subject, text, html) {
  try {
    console.log(`[MailUtil] Sending email to: ${to} with subject: "${subject}"`);
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      text,
      html,
    });
    console.log(`[MailUtil] Email sent successfully. MessageID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[MailUtil] Error sending email to ${to}:`, error);
    throw error;
  }
}
