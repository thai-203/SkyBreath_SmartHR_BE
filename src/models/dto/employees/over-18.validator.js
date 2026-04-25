// src/models/dto/employees/over-18.validator.js

const { ValidatorConstraint, ValidatorConstraintInterface } = require('class-validator');

@ValidatorConstraint({ async: false })
class IsOver18 {
    validate(dateOfBirth) {
        const today = new Date();  // Lấy ngày hiện tại
        const birthDate = new Date(dateOfBirth);  // Chuyển đổi ngày sinh thành đối tượng Date

        const age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();

        // Nếu chưa đủ 18 tuổi, kiểm tra tháng và ngày
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1; // Nếu chưa đủ 18 tuổi, trừ đi 1
        }

        return age >= 18; // Kiểm tra tuổi có >= 18 không
    }

    defaultMessage() {
        return 'Nhân viên phải trên 18 tuổi'; // Thông báo lỗi nếu không đạt yêu cầu
    }
}
module.exports = { IsOver18 }; 