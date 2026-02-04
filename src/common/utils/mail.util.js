import { transporter } from '../../config/mail.config.js';
import { config } from '../../config/env.config.js';

const FROM_EMAIL = `"SkyBreathHRM System" <${config.mail.user}>`;

export default async function sendMail(to, subject, text, html) {
  return transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    text,
    html,
  });
}
