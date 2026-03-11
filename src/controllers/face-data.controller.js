import { ResponseUtil } from '../common/utils/response.util.js';
import { FaceDataService } from '../services/face-data.service.js';

const faceDataService = new FaceDataService();

export const registerFace = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    const files = req.files;

    const result = await faceDataService.registerFaces(employeeId, files);

    ResponseUtil.sendResponse(res, 'OK', result);
  } catch (err) {
    next(err);
  }
};

export const getRegisteredFaces = async (req, res, next) => {
  try {
    const employeeId = req.query.employeeId || req.body.employeeId;

    if (!employeeId) {
      return res.status(400).json({ message: 'employeeId is required' });
    }

    const faces = await faceDataService.getFacesByEmployee(employeeId);

    res.json({
      success: true,
      data: faces.map((face) => ({
        id: face.id,
        registeredAt: face.registeredAt,
        imageUrl: face.imageUrl,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const getAllFaces = async (req, res, next) => {
  try {
    if (!req.user?.roles?.includes('ADMIN')) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const faces = await faceDataService.getAllFaces();

    res.json({
      success: true,
      data: faces.map((face) => ({
        id: face.id,
        employeeId: face.employeeId,
        employeeName: face.employee?.fullName || null,
        imageUrl: face.imageUrl,
        registeredAt: face.registeredAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const deleteFace = async (req, res, next) => {
  try {
    if (!req.user?.roles?.includes('ADMIN')) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Face id is required' });
    }

    await faceDataService.deleteFaceById(id);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const deleteFacesByEmployee = async (req, res, next) => {
  try {
    if (!req.user?.roles?.includes('ADMIN')) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({ message: 'Employee id is required' });
    }

    await faceDataService.deleteEmployeeFaces(employeeId);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
