/**
 * Shift Management API Test Examples
 * File này chứa các ví dụ test cho tất cả endpoints
 * 
 * Yêu cầu: Cài đặt axios hoặc fetch API
 * npm install axios
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const AUTH_TOKEN = 'your-jwt-token-here'; // Thay thế bằng token thực tế

// Helper function để gửi requests
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`
  }
});

// Helper để print results
const printResult = (title, result) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(60)}`);
  console.log(JSON.stringify(result.data, null, 2));
};

/**
 * Test Shift Group APIs
 */
async function testShiftGroupAPIs() {
  console.log('\n========== TESTING SHIFT GROUP APIS ==========\n');

  let groupId;

  try {
    // 1. Create Shift Group
    console.log('1. Creating shift group...');
    const createResponse = await api.post('/shift-groups', {
      name: 'Nhóm ca làm việc chính',
      description: 'Nhóm ca làm việc cho toàn công ty',
      companyId: '550e8400-e29b-41d4-a716-446655440000'
    });
    printResult('Create Shift Group', createResponse);
    groupId = createResponse.data.data.id;

    // 2. Get All Shift Groups
    console.log('\n2. Getting all shift groups...');
    const getAllResponse = await api.get('/shift-groups', {
      params: {
        companyId: '550e8400-e29b-41d4-a716-446655440000',
        isActive: true,
        limit: 10,
        offset: 0
      }
    });
    printResult('Get All Shift Groups', getAllResponse);

    // 3. Get Shift Group by ID
    console.log('\n3. Getting shift group by ID...');
    const getByIdResponse = await api.get(`/shift-groups/${groupId}`);
    printResult('Get Shift Group by ID', getByIdResponse);

    // 4. Update Shift Group
    console.log('\n4. Updating shift group...');
    const updateResponse = await api.put(`/shift-groups/${groupId}`, {
      name: 'Nhóm ca làm việc chính - Updated',
      description: 'Mô tả được cập nhật',
      isActive: true
    });
    printResult('Update Shift Group', updateResponse);

    // 5. Get Shift Group Details
    console.log('\n5. Getting shift group details with work shifts...');
    const detailsResponse = await api.get(`/shift-groups/${groupId}/details`);
    printResult('Get Shift Group Details', detailsResponse);

    return groupId;
  } catch (error) {
    console.error('Error in testShiftGroupAPIs:', error.response?.data || error.message);
  }
}

/**
 * Test Work Shift APIs
 */
async function testWorkShiftAPIs(groupId) {
  console.log('\n========== TESTING WORK SHIFT APIS ==========\n');

  let shiftId;

  try {
    // 1. Create Work Shift
    console.log('1. Creating work shift...');
    const createResponse = await api.post('/work-shifts', {
      name: 'Ca sáng',
      description: 'Ca làm việc buổi sáng',
      shiftGroupId: groupId,
      startTime: '08:00:00',
      endTime: '12:00:00',
      breakDuration: 0
    });
    printResult('Create Work Shift', createResponse);
    shiftId = createResponse.data.data.id;

    // 2. Get Work Shifts by Group
    console.log('\n2. Getting work shifts by group...');
    const getByGroupResponse = await api.get(`/shift-groups/${groupId}/work-shifts`, {
      params: {
        isActive: true,
        limit: 10
      }
    });
    printResult('Get Work Shifts by Group', getByGroupResponse);

    // 3. Get Work Shift by ID
    console.log('\n3. Getting work shift by ID...');
    const getByIdResponse = await api.get(`/work-shifts/${shiftId}`);
    printResult('Get Work Shift by ID', getByIdResponse);

    // 4. Update Work Shift
    console.log('\n4. Updating work shift...');
    const updateResponse = await api.put(`/work-shifts/${shiftId}`, {
      name: 'Ca sáng - Updated',
      description: 'Mô tả ca sáng được cập nhật',
      startTime: '08:30:00',
      endTime: '12:30:00'
    });
    printResult('Update Work Shift', updateResponse);

    // 5. Create another shift for testing (Ca chiều)
    console.log('\n5. Creating another work shift (afternoon)...');
    const afternoonResponse = await api.post('/work-shifts', {
      name: 'Ca chiều',
      description: 'Ca làm việc buổi chiều',
      shiftGroupId: groupId,
      startTime: '13:00:00',
      endTime: '17:00:00',
      breakDuration: 0
    });
    printResult('Create Afternoon Shift', afternoonResponse);

    return shiftId;
  } catch (error) {
    console.error('Error in testWorkShiftAPIs:', error.response?.data || error.message);
  }
}

/**
 * Test Shift Assignment APIs
 */
async function testShiftAssignmentAPIs(shiftId) {
  console.log('\n========== TESTING SHIFT ASSIGNMENT APIS ==========\n');

  let assignmentId;

  try {
    // 1. Assign Shift to Employee
    console.log('1. Assigning shift to employee...');
    const assignToEmpResponse = await api.post('/shift-assignments/employee', {
      workShiftId: shiftId,
      employeeId: '660e8400-e29b-41d4-a716-446655440000',
      assignDate: new Date().toISOString().split('T')[0],
      notes: 'Phân ca cho nhân viên'
    });
    printResult('Assign Shift to Employee', assignToEmpResponse);
    assignmentId = assignToEmpResponse.data.data.id;

    // 2. Get Shift Assignment by ID
    console.log('\n2. Getting shift assignment by ID...');
    const getByIdResponse = await api.get(`/shift-assignments/${assignmentId}`);
    printResult('Get Shift Assignment by ID', getByIdResponse);

    // 3. Get Employee Shift Schedule
    console.log('\n3. Getting employee shift schedule...');
    const empScheduleResponse = await api.get('/employees/660e8400-e29b-41d4-a716-446655440000/shift-schedule', {
      params: {
        status: 'ACTIVE',
        limit: 50
      }
    });
    printResult('Get Employee Shift Schedule', empScheduleResponse);

    // 4. Update Shift Assignment
    console.log('\n4. Updating shift assignment...');
    const updateResponse = await api.put(`/shift-assignments/${assignmentId}`, {
      status: 'ACTIVE',
      notes: 'Ghi chú được cập nhật'
    });
    printResult('Update Shift Assignment', updateResponse);

    // 5. Assign Shift to Department
    console.log('\n5. Assigning shift to department...');
    const assignToDeptResponse = await api.post('/shift-assignments/department', {
      workShiftId: shiftId,
      departmentId: '770e8400-e29b-41d4-a716-446655440000',
      assignDate: new Date().toISOString().split('T')[0],
      notes: 'Phân ca cho toàn bộ phòng ban'
    });
    printResult('Assign Shift to Department', assignToDeptResponse);

    // 6. Get Department Shift Schedule
    console.log('\n6. Getting department shift schedule...');
    const deptScheduleResponse = await api.get('/departments/770e8400-e29b-41d4-a716-446655440000/shift-schedule', {
      params: {
        status: 'ACTIVE'
      }
    });
    printResult('Get Department Shift Schedule', deptScheduleResponse);

    return assignmentId;
  } catch (error) {
    console.error('Error in testShiftAssignmentAPIs:', error.response?.data || error.message);
  }
}

/**
 * Test Delete APIs
 */
async function testDeleteAPIs(assignmentId, shiftId, groupId) {
  console.log('\n========== TESTING DELETE APIS ==========\n');

  try {
    // 1. Cancel Shift Assignment
    console.log('1. Cancelling shift assignment...');
    const cancelResponse = await api.delete(`/shift-assignments/${assignmentId}`);
    printResult('Cancel Shift Assignment', cancelResponse);

    // 2. Delete Work Shift (after cancelling assignments)
    console.log('\n2. Deleting work shift...');
    const deleteShiftResponse = await api.delete(`/work-shifts/${shiftId}`);
    printResult('Delete Work Shift', deleteShiftResponse);

    // 3. Delete Shift Group (after deleting work shifts)
    console.log('\n3. Deleting shift group...');
    const deleteGroupResponse = await api.delete(`/shift-groups/${groupId}`);
    printResult('Delete Shift Group', deleteGroupResponse);
  } catch (error) {
    console.error('Error in testDeleteAPIs:', error.response?.data || error.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('SHIFT MANAGEMENT API TESTS');
    console.log('='.repeat(60));

    // Test Shift Groups
    const groupId = await testShiftGroupAPIs();

    if (groupId) {
      // Test Work Shifts
      const shiftId = await testWorkShiftAPIs(groupId);

      if (shiftId) {
        // Test Shift Assignments
        const assignmentId = await testShiftAssignmentAPIs(shiftId);

        if (assignmentId) {
          // Test Deletes
          await testDeleteAPIs(assignmentId, shiftId, groupId);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('TESTS COMPLETED');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Fatal error:', error.message);
  }
}

// Export functions for use in other test files
module.exports = {
  testShiftGroupAPIs,
  testWorkShiftAPIs,
  testShiftAssignmentAPIs,
  testDeleteAPIs,
  runAllTests,
  api
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
