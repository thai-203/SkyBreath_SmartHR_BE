/**
 * Shift Validation Middleware
 * Middleware để validate requests cho shift management
 */

/**
 * Validate shift group creation request
 */
const validateShiftGroupCreate = (req, res, next) => {
  const { name, companyId } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Shift group name is required'
    });
  }

  if (!companyId || !companyId.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Company ID is required'
    });
  }

  if (name.length > 255) {
    return res.status(400).json({
      success: false,
      message: 'Shift group name must not exceed 255 characters'
    });
  }

  next();
};

/**
 * Validate work shift creation request
 */
const validateWorkShiftCreate = (req, res, next) => {
  const { name, shiftGroupId, startTime, endTime } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Work shift name is required'
    });
  }

  if (!shiftGroupId || !shiftGroupId.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Shift group ID is required'
    });
  }

  const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

  if (!startTime || !timeRegex.test(startTime)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid start time format. Expected HH:mm:ss'
    });
  }

  if (!endTime || !timeRegex.test(endTime)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid end time format. Expected HH:mm:ss'
    });
  }

  // Validate start and end times are different
  if (startTime === endTime) {
    return res.status(400).json({
      success: false,
      message: 'Start time and end time must be different'
    });
  }

  next();
};

/**
 * Validate shift assignment creation request
 */
const validateShiftAssignmentCreate = (req, res, next) => {
  const { workShiftId, employeeId, departmentId, assignmentType } = req.body;

  if (!workShiftId || !workShiftId.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Work shift ID is required'
    });
  }

  // For individual assignment
  if (!employeeId && !departmentId) {
    return res.status(400).json({
      success: false,
      message: 'Either employee ID or department ID is required'
    });
  }

  // Cannot assign to both employee and department at the same time
  if (employeeId && departmentId) {
    return res.status(400).json({
      success: false,
      message: 'Cannot assign to both employee and department. Choose one.'
    });
  }

  next();
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const { limit, offset } = req.query;

  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be a number between 1 and 1000'
      });
    }
  }

  if (offset) {
    const offsetNum = parseInt(offset);
    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'Offset must be a non-negative number'
      });
    }
  }

  next();
};

/**
 * Validate UUID format
 */
const validateUUID = (param = 'id') => {
  return (req, res, next) => {
    const id = req.params[param];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${param} format. Must be a valid UUID`
      });
    }

    next();
  };
};

module.exports = {
  validateShiftGroupCreate,
  validateWorkShiftCreate,
  validateShiftAssignmentCreate,
  validatePagination,
  validateUUID
};
