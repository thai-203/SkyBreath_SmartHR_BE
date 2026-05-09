import { FaceRecognitionConfigService } from '../services/face-recognition-config.service.js';
import { AppMessages } from '../common/constants/index.js';
import { ResponseUtil } from '../common/utils/response.util.js';
import { plainToInstance } from 'class-transformer';
import { UpdateFaceRecognitionConfigDto } from '../models/dto/face-recognition-config/update-face-recognition-config.dto.js';

export class FaceRecognitionConfigController {
  constructor() {
    this.service = new FaceRecognitionConfigService();
  }

  getConfig = async (req, res, next) => {
    try {
      const config = await this.service.getConfig();
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.FaceRecognitionConfig.RETRIEVED,
        config,
      );
    } catch (error) {
      next(error);
    }
  };

  updateConfig = async (req, res, next) => {
    try {
      const data = plainToInstance(UpdateFaceRecognitionConfigDto, req.body);
      const updated = await this.service.updateConfig(data);
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.FaceRecognitionConfig.UPDATED,
        updated,
      );
    } catch (error) {
      next(error);
    }
  };

  resetToDefaults = async (req, res, next) => {
    try {
      const result = await this.service.resetToDefaults();
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.FaceRecognitionConfig.RESET,
        result,
      );
    } catch (error) {
      next(error);
    }
  };
}
