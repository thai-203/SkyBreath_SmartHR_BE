/**
 * Shift Utility Functions
 * Các hàm tiện ích cho quản lý ca làm việc
 */

/**
 * Tính toán thời gian làm việc (phút)
 * @param {string} startTime - Giờ bắt đầu (HH:mm:ss)
 * @param {string} endTime - Giờ kết thúc (HH:mm:ss)
 * @param {number} breakDuration - Thời gian nghỉ (phút)
 * @returns {number} Thời gian làm việc (phút)
 */
function calculateWorkDuration(startTime, endTime, breakDuration = 0) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let start = startHour * 60 + startMin;
  let end = endHour * 60 + endMin;

  // If end time is less than start time, assume next day
  if (end < start) {
    end += 24 * 60;
  }

  return end - start - (breakDuration || 0);
}

/**
 * Kiểm tra hai ca làm việc có xung đột giờ hay không
 * @param {string} start1 - Giờ bắt đầu ca 1
 * @param {string} end1 - Giờ kết thúc ca 1
 * @param {string} start2 - Giờ bắt đầu ca 2
 * @param {string} end2 - Giờ kết thúc ca 2
 * @returns {boolean} true nếu có xung đột
 */
function hasTimeConflict(start1, end1, start2, end2) {
  const timeToMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  // Handle next day times
  if (end1Min <= start1Min) end1Min += 24 * 60;
  if (end2Min <= start2Min) end2Min += 24 * 60;

  return !(end1Min <= start2Min || end2Min <= start1Min);
}

/**
 * Format thời gian theo định dạng HH:mm:ss
 * @param {number} minutes - Số phút
 * @returns {string} Định dạng HH:mm:ss
 */
function minutesToTimeString(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const secs = 0;

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Chuyển đổi thời gian sang định dạng có thể đọc được
 * @param {string} time - Thời gian (HH:mm:ss)
 * @returns {string} Định dạng dễ đọc (VD: 09:30 AM)
 */
function formatTimeReadable(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/**
 * Tính tuần làm việc từ ngày bắt đầu
 * @param {Date} date - Ngày cần tính
 * @returns {object} { weekStart, weekEnd, weekNumber }
 */
function getWeekInfo(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday

  const weekStart = new Date(d.setDate(diff));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekNumber = Math.ceil(((weekStart - new Date(weekStart.getFullYear(), 0, 1)) / 86400000 + 1) / 7);

  return {
    weekStart,
    weekEnd,
    weekNumber
  };
}

/**
 * Validate ngày phân ca không vượt quá một khoảng thời gian
 * @param {Date} assignDate - Ngày phân ca
 * @param {number} daysInAdvance - Số ngày phải phân trước (mặc định: 30)
 * @returns {boolean} true nếu hợp lệ
 */
function isValidAssignmentDate(assignDate, daysInAdvance = 30) {
  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + daysInAdvance);

  return assignDate >= today && assignDate <= maxDate;
}

/**
 * Nhóm lịch làm việc theo tuần
 * @param {array} assignments - Danh sách phân ca
 * @returns {object} Phân ca được nhóm theo tuần
 */
function groupScheduleByWeek(assignments) {
  const grouped = {};

  assignments.forEach((assignment) => {
    const weekInfo = getWeekInfo(new Date(assignment.assignDate));
    const weekKey = `week_${weekInfo.weekNumber}_${new Date(weekInfo.weekStart).getFullYear()}`;

    if (!grouped[weekKey]) {
      grouped[weekKey] = {
        weekNumber: weekInfo.weekNumber,
        weekStart: weekInfo.weekStart,
        weekEnd: weekInfo.weekEnd,
        assignments: []
      };
    }

    grouped[weekKey].assignments.push(assignment);
  });

  return grouped;
}

module.exports = {
  calculateWorkDuration,
  hasTimeConflict,
  minutesToTimeString,
  formatTimeReadable,
  getWeekInfo,
  isValidAssignmentDate,
  groupScheduleByWeek
};
