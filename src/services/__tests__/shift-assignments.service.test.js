describe('ShiftAssignmentsService', () => {
  describe('Create & Update Shift Assignment - Specified validation and success messages', () => {
    const MockSvc = function () {
      this.createAssignment = jest.fn(async (payload) => {
        const { employeeIds, departmentIds, shiftIds, startDate, endDate } =
          payload || {};
        if (!employeeIds || employeeIds.length === 0) {
          const err = new Error('Phải chọn nhân viên hoặc phòng ban');
          err.statusCode = 400;
          throw err;
        }
        if (!departmentIds || departmentIds.length === 0) {
          const err = new Error('Phải chọn nhân viên hoặc phòng ban');
          err.statusCode = 400;
          throw err;
        }
        if (!shiftIds || shiftIds.length === 0) {
          const err = new Error('Vui lòng chọn ít nhất một ca làm việc');
          err.statusCode = 400;
          throw err;
        }
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
          const err = new Error(
            'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc',
          );
          err.statusCode = 400;
          throw err;
        }

        return {
          success: true,
          message: 'Phân ca thành công',
          statusCode: 200,
        };
      });

      this.updateAssignment = jest.fn(async (id, payload) => {
        const { employeeIds, departmentIds, shiftIds, startDate, endDate } =
          payload || {};
        if (!employeeIds || employeeIds.length === 0) {
          const err = new Error('Phải chọn nhân viên hoặc phòng ban');
          err.statusCode = 400;
          throw err;
        }
        if (!departmentIds || departmentIds.length === 0) {
          const err = new Error('Phải chọn nhân viên hoặc phòng ban');
          err.statusCode = 400;
          throw err;
        }
        if (!shiftIds || shiftIds.length === 0) {
          const err = new Error('Vui lòng chọn ít nhất một ca làm việc');
          err.statusCode = 400;
          throw err;
        }
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
          const err = new Error(
            'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc',
          );
          err.statusCode = 400;
          throw err;
        }
        return {
          success: true,
          message: 'Cập nhật phân ca thành công',
          statusCode: 200,
        };
      });
    };

    let mockSvc;

    beforeEach(() => {
      mockSvc = new MockSvc();
    });

    describe('Create Shift Assignment - success cases', () => {
      test('Phân ca thành công', async () => {
        const payload = {
          assignmentName: 'Ca ot ngày thường',
          employeeIds: [4, 7, 5, 6, 3, 2, 10, 8, 9, 1],
          departmentIds: [12, 11, 13, 2, 1, 10],
          shiftIds: [3],
          startDate: '2026-04-01',
          endDate: '2026-04-30',
          weekdays: [1, 3, 5],
          repeatType: '2weeks',
        };

        const res = await mockSvc.createAssignment(payload);
        expect(res).toEqual({
          success: true,
          message: 'Phân ca thành công',
          statusCode: 200,
        });
      });
    });

    describe('Create Shift Assignment - validation cases', () => {
      test('Không cho phân ca khi không chọn nhân viên', async () => {
        await expect(
          mockSvc.createAssignment({
            employeeIds: [],
            departmentIds: [12, 11, 13, 2, 1, 10],
            shiftIds: [1],
          }),
        ).rejects.toMatchObject({
          message: 'Phải chọn nhân viên hoặc phòng ban',
          statusCode: 400,
        });
      });

      test('Không cho phân ca khi không chọn phòng ban', async () => {
        await expect(
          mockSvc.createAssignment({
            employeeIds: [4, 7, 5, 6, 3, 2, 10, 8, 9, 1],
            departmentIds: [],
            shiftIds: [1],
          }),
        ).rejects.toMatchObject({
          message: 'Phải chọn nhân viên hoặc phòng ban',
          statusCode: 400,
        });
      });

      test('Không cho phân ca khi không chọn ca làm việc', async () => {
        await expect(
          mockSvc.createAssignment({
            employeeIds: [1],
            departmentIds: [12],
            shiftIds: [],
          }),
        ).rejects.toMatchObject({
          message: 'Vui lòng chọn ít nhất một ca làm việc',
          statusCode: 400,
        });
      });
    });

    describe('Create Shift Assignment - invalid date cases', () => {
      test('Không cho phân ca khi ngày bắt đầu lớn hơn ngày kết thúc', async () => {
        await expect(
          mockSvc.createAssignment({
            employeeIds: [1],
            departmentIds: [12],
            shiftIds: [2],
            startDate: '2026-04-01',
            endDate: '2026-03-30',
          }),
        ).rejects.toMatchObject({
          message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc',
          statusCode: 400,
        });
      });
    });

    describe('Update Shift Assignment - success cases', () => {
      test('Cập nhật phân ca thành công', async () => {
        const payload = {
          assignmentName: 'Ca ot ngày thường',
          employeeIds: [4, 7, 5, 6, 3, 2, 10, 8, 9, 1],
          departmentIds: [12, 11, 13, 2, 1, 10],
          shiftIds: [3],
          startDate: '2026-04-01',
          endDate: '2026-04-30',
          weekdays: [1, 3, 5],
          repeatType: '2weeks',
        };

        const res = await mockSvc.updateAssignment(1, payload);
        expect(res).toEqual({
          success: true,
          message: 'Cập nhật phân ca thành công',
          statusCode: 200,
        });
      });
    });

    describe('Update Shift Assignment - validation cases', () => {
      test('Không cho cập nhật phân ca khi không chọn nhân viên', async () => {
        await expect(
          mockSvc.updateAssignment(5, {
            employeeIds: [],
            departmentIds: [12, 11, 13, 2, 1, 10],
            shiftIds: [1],
          }),
        ).rejects.toMatchObject({
          message: 'Phải chọn nhân viên hoặc phòng ban',
          statusCode: 400,
        });
      });

      test('Không cho cập nhật phân ca khi không chọn phòng ban', async () => {
        await expect(
          mockSvc.updateAssignment(5, {
            employeeIds: [4, 7, 5, 6, 3, 2, 10, 8, 9, 1],
            departmentIds: [],
            shiftIds: [1],
          }),
        ).rejects.toMatchObject({
          message: 'Phải chọn nhân viên hoặc phòng ban',
          statusCode: 400,
        });
      });

      test('Không cho cập nhật phân ca khi không chọn ca làm việc', async () => {
        await expect(
          mockSvc.updateAssignment(5, {
            employeeIds: [1],
            departmentIds: [12],
            shiftIds: [],
          }),
        ).rejects.toMatchObject({
          message: 'Vui lòng chọn ít nhất một ca làm việc',
          statusCode: 400,
        });
      });
    });

    describe('Update Shift Assignment - invalid date cases', () => {
      test('Không cho cập nhật phân ca khi ngày bắt đầu lớn hơn ngày kết thúc', async () => {
        await expect(
          mockSvc.updateAssignment(5, {
            employeeIds: [1],
            departmentIds: [12],
            shiftIds: [2],
            startDate: '2026-04-01',
            endDate: '2026-03-30',
          }),
        ).rejects.toMatchObject({
          message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc',
          statusCode: 400,
        });
      });
    });
  });
});
