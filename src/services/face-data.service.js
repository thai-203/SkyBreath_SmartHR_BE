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
const REGISTER_SIMILARITY_THRESHOLD = 0.5;

export class FaceDataService {
  constructor() {
    this.faceDataRepository = new FaceDataRepository();
    this.arcFaceService = new ArcFaceService();
    this.faceRecognitionConfigRepository =
      new FaceRecognitionConfigRepository();
    this.employeeRepository = new EmployeesRepository();
  }

  // ── Register ──────────────────────────────────────────────────────────

  async registerFaces(employeeId, files) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Images required');
    }

    // 1. Lấy config từ DB
    const config = await this.faceRecognitionConfigRepository.findOneConfig();
    if (!config) {
      throw new Error('Face recognition config chưa được khởi tạo.');
    }

    const spoofThreshold = Number(config.spoofThreshold);
    const recognitionThreshold = Number(REGISTER_SIMILARITY_THRESHOLD);
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
      throw new BadRequestException(
        `Liveness thấp (${aiResult.avg_liveness_score}), ngưỡng yêu cầu: ${spoofThreshold}.`,
      );
    }

    // 4. Validate từng frame: face count + face size
    for (const frame of aiResult.frames) {
      if (frame.face_count === 0) {
        throw new BadRequestException(
          `Frame ${frame.frame_index + 1}: không phát hiện khuôn mặt.`,
        );
      }

      if (frame.face_count > maxFacesAllowed) {
        throw new BadRequestException(
          `Frame ${frame.frame_index + 1}: phát hiện ${frame.face_count} khuôn mặt, chỉ cho phép tối đa ${maxFacesAllowed}.`,
        );
      }

      for (const face of frame.faces) {
        const minDim = Math.min(face.width, face.height);
        if (minDim < faceDetectionMinSize) {
          throw new BadRequestException(
            `Frame ${frame.frame_index + 1}: khuôn mặt quá nhỏ (${minDim}px), yêu cầu tối thiểu ${faceDetectionMinSize}px.`,
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
          `Frame ${i + 1} khác người với frame 1 (similarity=${sim.toFixed(4)}, ngưỡng=${recognitionThreshold}, metric=${similarityMetric}).`,
        );
      }
    }

    // 7. Lưu tất cả embeddings vào DB
    const faceData = embeddings.map((embedding, index) => {
      const file = files[Math.min(index, files.length - 1)];
      const imageUrl = file
        ? `/uploads/${path.relative('uploads', file.path).replace(/\\/g, '/')}`
        : null;

      return {
        employeeId,
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

  async getPersonalFaceData(employeeId) {
    const employee = await this.faceDataRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundException('Không tìm thấy dữ liệu sinh trắc');
    }
    return employee;
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
