const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.development' });

async function fix() {
  console.log(`🚀 Đang kết nối tới DB: ${process.env.DB_DATABASE} với user: ${process.env.DB_USERNAME}`);
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });

  try {
    console.log('✅ Đã kết nối MySQL thành công');

    // 1. Tìm tên các Foreign Key (FK) đang bám vào bảng face_data
    const [rows] = await connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'face_data' 
      AND TABLE_SCHEMA = ?
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [process.env.DB_DATABASE]);

    if (rows.length > 0) {
      for (const row of rows) {
        console.log(`🔥 Đang gỡ bỏ Foreign Key chặn đường: ${row.CONSTRAINT_NAME}`);
        await connection.execute(`ALTER TABLE face_data DROP FOREIGN KEY ${row.CONSTRAINT_NAME}`);
      }
    } else {
        console.log('ℹ️ Không tìm thấy Khóa ngoại nào đang chặn.');
    }

    // 2. Thử xóa index bị treo
    try {
      console.log('🔥 Thử dọn dẹp Index treo: REL_5537156f2f68ec1b5a2ba2334e');
      await connection.execute('DROP INDEX `REL_5537156f2f68ec1b5a2ba2334e` ON `face_data`');
      console.log('✅ Đã dọn dẹp Index thành công.');
    } catch (e) {
      console.log('ℹ️ Index đã được dọn dẹp trước đó hoặc không tồn tại.');
    }

    console.log('🎉 XỬ LÝ HOÀN TẤT! Giờ bạn hãy chạy npm run start:dev, TypeORM sẽ tự tạo lại cấu trúc mới.');
  } catch (error) {
    console.error('❌ Lỗi thực thi:', error.message);
  } finally {
    await connection.end();
  }
}

fix();
