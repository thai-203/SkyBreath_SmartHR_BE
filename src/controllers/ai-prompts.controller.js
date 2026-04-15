import { AppDataSource } from '../database/data-source.js';
import { AiPromptEntity } from '../models/entities/ai-prompt.entity.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class AiPromptsController {
  constructor() {
    this.promptRepo = AppDataSource.getRepository(AiPromptEntity);
  }

  getAll = async (req, res, next) => {
    try {
      const prompts = await this.promptRepo.find({
        order: { createdAt: 'DESC' },
      });
      return ResponseUtil.sendResponse(res, 'Lấy danh sách AI Prompts thành công', prompts);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const prompt = await this.promptRepo.findOne({ where: { id: Number(id) } });
      if (!prompt) {
        return ResponseUtil.sendResponse(res, 'Không tìm thấy Prompt', null, 404);
      }
      return ResponseUtil.sendResponse(res, 'Lấy Prompt thành công', prompt);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const { promptKey, promptContent, description, status } = req.body;

      const existing = await this.promptRepo.findOne({ where: { promptKey } });
      if (existing) {
        return ResponseUtil.sendResponse(res, 'Prompt Key đã tồn tại', null, 400);
      }

      const newPrompt = this.promptRepo.create({
        promptKey,
        promptContent,
        description,
        status: status || 'ACTIVE',
      });

      const saved = await this.promptRepo.save(newPrompt);
      return ResponseUtil.sendResponse(res, 'Tạo Prompt mới thành công', saved, 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const prompt = await this.promptRepo.findOne({ where: { id: Number(id) } });
      if (!prompt) {
        return ResponseUtil.sendResponse(res, 'Không tìm thấy Prompt', null, 404);
      }

      // Check unique key if attempt to update key
      if (data.promptKey && data.promptKey !== prompt.promptKey) {
        const existing = await this.promptRepo.findOne({ where: { promptKey: data.promptKey } });
        if (existing) {
          return ResponseUtil.sendResponse(res, 'Prompt Key đã tồn tại', null, 400);
        }
      }

      Object.assign(prompt, data);
      const updated = await this.promptRepo.save(prompt);

      return ResponseUtil.sendResponse(res, 'Cập nhật Prompt thành công', updated);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      const { id } = req.params;
      const prompt = await this.promptRepo.findOne({ where: { id: Number(id) } });
      if (!prompt) {
        return ResponseUtil.sendResponse(res, 'Không tìm thấy Prompt', null, 404);
      }

      await this.promptRepo.remove(prompt);
      return ResponseUtil.sendResponse(res, 'Xóa Prompt thành công', null);
    } catch (error) {
      next(error);
    }
  };
}
