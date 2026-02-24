import sendMail from '../common/utils/mail.util.js';
import { forgotPasswordEmailTemplate } from '../common/constants';

export class MailService {
  async sendResetPasswordEmail(to, username, resetUrl) {
    const html = forgotPasswordEmailTemplate({
      resetUrl,
      username,
      expireMinutes: 5,
    });

    const subject = 'Reset your password';
    const text = `Reset password link (expires in 5 minutes): ${resetUrl}`;

    await sendMail(to, subject, text, html);
  }

  async sendAccountInfo(to, fullName, username, password) {
    console.log(`[MailService] Preparing account info email for ${fullName} (${to})`);
    const subject = 'Thông tin tài khoản đăng nhập hệ thống SmartHR';
    const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #4f46e5; text-align: center;">Chào mừng ${fullName} gia nhập SmartHR!</h2>
                    <p>Hồ sơ nhân viên của bạn đã được tạo thành công trên hệ thống. Dưới đây là thông tin tài khoản đăng nhập của bạn:</p>
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Username:</strong> ${username}</p>
                        <p style="margin: 5px 0;"><strong>Mật khẩu mặc định:</strong> ${password}</p>
                    </div>
                    <p>Vui lòng đăng nhập và đổi mật khẩu ngay trong lần đầu tiên sử dụng để đảm bảo tính bảo mật.</p>
                    <p style="margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center;">
                        Đây là email tự động từ hệ thống SmartHR. Vui lòng không phản hồi email này.
                    </p>
                </div>
            `;

    try {
      await sendMail(to, subject, '', html);
      console.log(`[MailService] Account info email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error('[MailService] Failed to send account info email:', error.message);
      return false;
    }
  }
}

export const mailService = new MailService();
