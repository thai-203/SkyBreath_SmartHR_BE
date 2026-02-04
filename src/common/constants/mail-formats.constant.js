const forgotPasswordEmailTemplate = ({
  resetUrl,
  username = 'bạn',
  expireMinutes = 15,
}) => `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SkyBreathHRM</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.05);">

          <!-- HEADER -->
          <tr>
            <td style="background:#0d6efd; padding:24px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:24px;">
                SkyBreathHRM
              </h1>
              <p style="margin:6px 0 0; color:#dbe7ff; font-size:14px;">
                Human Resource Management System
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:30px;">
              <h2 style="margin-top:0; color:#333333;">
                Xin chào ${username} 👋
              </h2>

              <p style="color:#555555; line-height:1.6;">
                Bạn đã yêu cầu <b>đặt lại mật khẩu</b> cho tài khoản SkyBreathHRM.
              </p>

              <!-- BOX CONTENT -->
              <div style="background:#f1f5ff; border-left:4px solid #0d6efd; padding:16px; margin:20px 0;">
                <p style="margin:0; color:#333;">
                  🔐 Link đặt lại mật khẩu sẽ <b>hết hạn sau ${expireMinutes} phút</b>.
                </p>
              </div>

              <!-- BUTTON -->
              <div style="text-align:center; margin:30px 0;">
                <a href="${resetUrl}"
                   style="background:#0d6efd; color:#ffffff; text-decoration:none;
                          padding:12px 24px; border-radius:6px; font-weight:bold;
                          display:inline-block;">
                  Đặt lại mật khẩu
                </a>
              </div>

              <p style="color:#777777; font-size:14px;">
                Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
              </p>

              <p style="margin-bottom:0; color:#555;">
                Trân trọng,<br/>
                <b>SkyBreathHRM Team</b>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f0f0f0; padding:16px; text-align:center; font-size:12px; color:#888;">
              © 2026 SkyBreathHRM. All rights reserved.<br/>
              Đây là email tự động, vui lòng không trả lời.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export { forgotPasswordEmailTemplate };
