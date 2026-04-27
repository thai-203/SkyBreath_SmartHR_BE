import path from 'path';
import { ArcFaceService } from './arcface.service.js';
import { FaceDataRepository } from '../repositories/face-data.repository.js';
import { FaceRecognitionConfigRepository } from '../repositories/face-recognition-config.repository.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
import {
  NotFoundException,
  BadRequestException,
} from '../common/exceptions/index.js';
import { computeSimilarity } from '../common/utils/vector.utils.js';

export class FaceDataService {
  constructor() {
    this.faceDataRepository = new FaceDataRepository();
    this.arcFaceService = new ArcFaceService();
    this.faceRecognitionConfigRepository =
      new FaceRecognitionConfigRepository();
    this.employeeRepository = new EmployeesRepository();
  }

  // ── Register ──────────────────────────────────────────────────────────

  async registerFaces(userId, files) {
    const employee = await this.employeeRepository.findByUserId(userId);
    if (!employee) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }
    const faceDataExist =
      await this.faceDataRepository.findByEmployeeIdWithEmpInfo(employee.id);
    if (faceDataExist) {
      throw new BadRequestException('Nhân viên đã đăng ký khuôn mặt');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng cung cấp ít nhất một ảnh để đăng ký khuôn mặt.');
    }

    // 1. Lấy config từ DB
    const config = await this.faceRecognitionConfigRepository.findOneConfig();
    if (!config) {
      throw new Error('Cấu hình nhận diện khuôn mặt chưa được thiết lập. Vui lòng liên hệ quản trị viên.');
    }

    const spoofThreshold = Number(config.spoofThreshold);
    const recognitionThreshold = Number(config.recognitionThreshold);
    const similarityMetric = config.similarityMetric || 'cosine';
    const maxFacesAllowed = Number(config.maxFacesAllowed);
    const faceDetectionMinSize = Number(config.faceDetectionMinSize);

    // 2. Gửi ảnh sang Python — nhận raw AI data
    const aiResult = await this.arcFaceService.extractMulti(files);

    if (!aiResult.success) {
      throw new BadRequestException(aiResult.message);
    }

    // 3. Liveness check — so avg_liveness_score với spoofThreshold
    if (aiResult.avg_liveness_score < spoofThreshold) {
      throw new BadRequestException('Ảnh chụp không đủ độ chân thực (nghi ngờ ảnh giả mạo). Vui lòng chụp ảnh người thật, rõ nét và trực diện hơn.');
    }

    // 4. Validate từng frame: face count + face size
    for (const frame of aiResult.frames) {
      if (frame.face_count === 0) {
        throw new BadRequestException(
          `Ảnh thứ ${frame.frame_index + 1} không chứa khuôn mặt nào. Vui lòng chụp lại.`,
        );
      }

      if (frame.face_count > maxFacesAllowed) {
        throw new BadRequestException(
          `Ảnh thứ ${frame.frame_index + 1} chứa nhiều khuôn mặt. Vui lòng đảm bảo chỉ có duy nhất khuôn mặt của bạn trong khung hình.`,
        );
      }

      for (const face of frame.faces) {
        const minDim = Math.min(face.width, face.height);
        if (minDim < faceDetectionMinSize) {
          throw new BadRequestException(
            `Khuôn mặt trong ảnh thứ ${frame.frame_index + 1} quá nhỏ hoặc ở quá xa. Vui lòng đưa khuôn mặt lại gần camera hơn.`,
          );
        }
      }
    }

    // 5. Lấy embeddings (1 face/frame, đã validate ở trên)
    const embeddings = aiResult.frames.map((frame) => frame.faces[0].embedding);

    // 6. Cross-compare: tất cả frames phải là cùng 1 người
    const base = embeddings[0];
    for (let i = 1; i < embeddings.length; i++) {
      const sim = computeSimilarity(base, embeddings[i], similarityMetric);
      if (sim < recognitionThreshold) {
        throw new BadRequestException(
          `Khuôn mặt trong ảnh thứ ${i + 1} không khớp với ảnh đầu tiên. Vui lòng đảm bảo tất cả các ảnh đều là của cùng một người.`,
        );
      }
    }

    // 7. Lưu tất cả embeddings vào DB
    const faceData = embeddings.map((embedding, index) => {
      const file = files[Math.min(index, files.length - 1)];
      const imageUrl = file?.secure_url || file?.path || null;

      return {
        employeeId: employee.id,
        faceVector: JSON.stringify(embedding),
        imageUrl,
      };
    });

    await this.faceDataRepository.createMany(faceData);

    return {
      count: embeddings.length,
      imageUrl: faceData[0]?.imageUrl || null,
    };
  }

  // ── Queries ───────────────────────────────────────────────────────────

  async getFacesByEmployee(employeeId) {
    const employee =
      await this.faceDataRepository.findByEmployeeIdWithEmpInfo(employeeId);
    if (!employee) {
      throw new NotFoundException('Không tìm thấy dữ liệu sinh trắc');
    }
    return employee;
  }

  async getPersonalFaceData(userId) {
    const employee = await this.employeeRepository.findByUserId(userId);
    if (!employee) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }
    const employeeId = employee.id;

    const faceData = await this.faceDataRepository.findByEmployeeId(employeeId);
    if (!faceData) {
      throw new NotFoundException('Không tìm thấy dữ liệu sinh trắc');
    }
    return faceData;
  }

  async getAllFaces(queryDto) {
    const result = await this.faceDataRepository.findAll(queryDto);
    return {
      ...result,
      page: queryDto.page,
      limit: queryDto.limit,
      totalPages: Math.ceil(result.total / queryDto.limit),
    };
  }

  async deleteFaceById(id) {
    return this.faceDataRepository.deleteById(id);
  }

  async deleteEmployeeFaces(employeeId) {
    return this.faceDataRepository.deleteByEmployeeId(employeeId);
  }

  async getManagementMetaData() {
    const total = await this.employeeRepository.count();
    return { total };
  }
}
