import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

export class MailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.MAIL_PORT) || 587,
            secure: process.env.MAIL_SECURE === 'true',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });
    }

    async sendAccountInfo(to, fullName, username, password) {
        const mailOptions = {
            from: `"SmartHR System" <${process.env.MAIL_USER}>`,
            to,
            subject: 'Thông tin tài khoản đăng nhập hệ thống SmartHR',
            html: `
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
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Account info email sent to ${to}`);
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    }
}

export const mailService = new MailService();
