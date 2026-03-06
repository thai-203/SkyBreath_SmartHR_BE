import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'ShiftTimeOrdering', async: false })
export class ShiftTimeOrdering {
  validate(value, args) {
    const obj = args.object;
    console.log("Validating shift times:", obj);

    const toMinutes = (t) => {
      if (typeof t !== 'string') return null;
      const parts = t.split(':').map((p) => parseInt(p, 10));
      if (parts.length < 2 || parts.some(isNaN)) return null;
      return parts[0] * 60 + parts[1];
    };

    if (obj.startTime && obj.endTime) {
      const s = toMinutes(obj.startTime);
      const e = toMinutes(obj.endTime);
      if (s === null || e === null || s >= e) return false;
    }

    if (obj.breakStartTime && obj.breakEndTime) {
      const bs = toMinutes(obj.breakStartTime);
      const be = toMinutes(obj.breakEndTime);

      if (bs === null || be === null || bs >= be) return false;

      const s = toMinutes(obj.startTime);
      const e = toMinutes(obj.endTime);

      if (bs < s || be > e) return false;
    }

    return true;
  }

  defaultMessage() {
    return 'Thời gian ca không hợp lệ (kiểm tra thứ tự và phạm vi)';
  }
}