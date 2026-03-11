import path from 'path';
import { ArcFaceService } from './arcface.service';
import { FaceDataRepository } from '../repositories/face-data.repository';
import { FaceRecognitionConfigRepository } from '../repositories/face-recognition-config.repository';

export class FaceDataService {
  constructor() {
    this.faceDataRepository = new FaceDataRepository();
    this.arcFaceService = new ArcFaceService();
    this.faceRecognitionConfigRepository =
      new FaceRecognitionConfigRepository();
  }

  async registerFaces(employeeId, files) {
    if (!files || files.length === 0) {
      throw new Error('Images required');
    }

    const result = await this.arcFaceService.registerFaces(files);

    // console.log("results:" + result);

    if (!result.success) {
      throw new Error(result.message);
    }

    const embeddings = result.embeddings || [];

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

  async getFacesByEmployee(employeeId) {
    return this.faceDataRepository.findByEmployeeId(employeeId);
  }

  async getAllFaces() {
    return this.faceDataRepository.findAll();
  }

  async deleteFaceById(id) {
    return this.faceDataRepository.deleteById(id);
  }

  async deleteEmployeeFaces(employeeId) {
    return this.faceDataRepository.deleteByEmployeeId(employeeId);
  }
}
