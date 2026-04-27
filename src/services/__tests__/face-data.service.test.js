import { jest } from '@jest/globals';
import { FaceDataService } from '../face-data.service.js';
import { BadRequestException, NotFoundException } from '../../common/exceptions/index.js';

describe('FaceDataService - registerFaces', () => {
  let service;
  let mockEmployeeRepo;
  let mockFaceDataRepo;
  let mockConfigRepo;
  let mockArcFaceService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Init Mock Repositories
    mockEmployeeRepo = { findByUserId: jest.fn() };
    mockFaceDataRepo = { findByEmployeeIdWithEmpInfo: jest.fn(), createMany: jest.fn() };
    mockConfigRepo = { findOneConfig: jest.fn() };
    mockArcFaceService = { extractMulti: jest.fn() };

    service = new FaceDataService();
    
    // Replace service dependencies with mocks
    service.employeeRepository = mockEmployeeRepo;
    service.faceDataRepository = mockFaceDataRepo;
    service.faceRecognitionConfigRepository = mockConfigRepo;
    service.arcFaceService = mockArcFaceService;
  });

  const mockUserId = 1;
  const mockEmployee = { id: 10, fullName: 'John Doe' };
  const mockConfig = {
    spoofThreshold: 0.8,
    recognitionThreshold: 0.5,
    similarityMetric: 'cosine',
    maxFacesAllowed: 1,
    faceDetectionMinSize: 100,
  };
  const mockFiles = [{ filename: 'img1.jpg' }, { filename: 'img2.jpg' }];

  it('1. Quăng lỗi NotFound nếu không tìm thấy employee', async () => {
    mockEmployeeRepo.findByUserId.mockResolvedValue(null);

    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(NotFoundException);
    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow('Không tìm thấy nhân viên');
  });

  it('2. Quăng lỗi BadRequest nếu nhân viên đã đăng ký khuôn mặt', async () => {
    mockEmployeeRepo.findByUserId.mockResolvedValue(mockEmployee);
    mockFaceDataRepo.findByEmployeeIdWithEmpInfo.mockResolvedValue({ id: 1 }); // Đã tồn tại

    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(BadRequestException);
    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow('Nhân viên đã đăng ký khuôn mặt');
  });

  it('3. Quăng lỗi BadRequest nếu thiếu files', async () => {
    mockEmployeeRepo.findByUserId.mockResolvedValue(mockEmployee);
    mockFaceDataRepo.findByEmployeeIdWithEmpInfo.mockResolvedValue(null);

    await expect(service.registerFaces(mockUserId, [])).rejects.toThrow(BadRequestException);
    await expect(service.registerFaces(mockUserId, [])).rejects.toThrow('Vui lòng cung cấp ít nhất một ảnh để đăng ký khuôn mặt.');
  });

  it('4. Quăng lỗi khi gọi ArcFaceService thất bại (Microservice lỗi)', async () => {
    mockEmployeeRepo.findByUserId.mockResolvedValue(mockEmployee);
    mockFaceDataRepo.findByEmployeeIdWithEmpInfo.mockResolvedValue(null);
    mockConfigRepo.findOneConfig.mockResolvedValue(mockConfig);
    
    // Mock Microservice trả về fail
    mockArcFaceService.extractMulti.mockResolvedValue({ success: false, message: 'AI Engine Error' });

    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(BadRequestException);
    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow('AI Engine Error');
  });

  it('5. Quăng lỗi Liveness score quá thấp (Nghi ngờ ảnh giả mạo)', async () => {
    mockEmployeeRepo.findByUserId.mockResolvedValue(mockEmployee);
    mockFaceDataRepo.findByEmployeeIdWithEmpInfo.mockResolvedValue(null);
    mockConfigRepo.findOneConfig.mockResolvedValue(mockConfig);
    
    mockArcFaceService.extractMulti.mockResolvedValue({ 
      success: true, 
      avg_liveness_score: 0.5 // Thấp hơn ngưỡng 0.8
    });

    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(BadRequestException);
    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(/nghi ngờ ảnh giả mạo/);
  });

  it('6. Quăng lỗi do Frame có nhiều hơn 1 khuôn mặt', async () => {
    mockEmployeeRepo.findByUserId.mockResolvedValue(mockEmployee);
    mockFaceDataRepo.findByEmployeeIdWithEmpInfo.mockResolvedValue(null);
    mockConfigRepo.findOneConfig.mockResolvedValue(mockConfig);
    
    mockArcFaceService.extractMulti.mockResolvedValue({ 
      success: true, 
      avg_liveness_score: 0.9,
      frames: [
        { frame_index: 0, face_count: 2, faces: [{}, {}] } // 2 khuôn mặt
      ]
    });

    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(BadRequestException);
    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(/nhiều khuôn mặt/);
  });

  it('7. Quăng lỗi do khuôn mặt trong ảnh quá nhỏ', async () => {
    mockEmployeeRepo.findByUserId.mockResolvedValue(mockEmployee);
    mockFaceDataRepo.findByEmployeeIdWithEmpInfo.mockResolvedValue(null);
    mockConfigRepo.findOneConfig.mockResolvedValue(mockConfig);
    
    mockArcFaceService.extractMulti.mockResolvedValue({ 
      success: true, 
      avg_liveness_score: 0.9,
      frames: [
        { frame_index: 0, face_count: 1, faces: [{ width: 50, height: 50 }] } // 50 < 100
      ]
    });

    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(BadRequestException);
    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(/quá nhỏ hoặc ở quá xa/);
  });

  it('8. Quăng lỗi do ảnh các frame không phải cùng một người (Cross-compare fail)', async () => {
    mockEmployeeRepo.findByUserId.mockResolvedValue(mockEmployee);
    mockFaceDataRepo.findByEmployeeIdWithEmpInfo.mockResolvedValue(null);
    mockConfigRepo.findOneConfig.mockResolvedValue(mockConfig);
    
    mockArcFaceService.extractMulti.mockResolvedValue({ 
      success: true, 
      avg_liveness_score: 0.9,
      frames: [
        // [1, 0] and [0, 1] are orthogonal. Cosine similarity = 0.0 < 0.5 threshold
        { frame_index: 0, face_count: 1, faces: [{ width: 200, height: 200, embedding: [1, 0] }] },
        { frame_index: 1, face_count: 1, faces: [{ width: 200, height: 200, embedding: [0, 1] }] }
      ]
    });

    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(BadRequestException);
    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(/không khớp với ảnh đầu tiên/);
  });

  it('9. Đăng ký thành công và lưu database', async () => {
    mockEmployeeRepo.findByUserId.mockResolvedValue(mockEmployee);
    mockFaceDataRepo.findByEmployeeIdWithEmpInfo.mockResolvedValue(null);
    mockConfigRepo.findOneConfig.mockResolvedValue(mockConfig);
    
    // Dùng 2 vector giống hệt nhau để Cosine similarity = 1.0 > 0.5 threshold
    const mockEmbedding1 = [1, 0];
    const mockEmbedding2 = [1, 0];

    const mockFiles = [{ path: 'url1' }, { path: 'url2' }];

    mockArcFaceService.extractMulti.mockResolvedValue({ 
      success: true, 
      avg_liveness_score: 0.9,
      final_embedding: [1, 0],
      frames: [
        { frame_index: 0, face_count: 1, faces: [{ width: 200, height: 200, embedding: mockEmbedding1 }] },
        { frame_index: 1, face_count: 1, faces: [{ width: 200, height: 200, embedding: mockEmbedding2 }] }
      ]
    });

    // Mock DB trả về object vừa lưu
    mockFaceDataRepo.createMany.mockResolvedValue([{ id: 99, employeeId: 10 }]);

    const result = await service.registerFaces(mockUserId, mockFiles);

    expect(result).toEqual({ count: 2, imageUrl: 'url1' });
    expect(mockArcFaceService.extractMulti).toHaveBeenCalledWith(mockFiles);
    expect(mockFaceDataRepo.createMany).toHaveBeenCalledWith([
      { employeeId: 10, faceVector: '[1,0]', imageUrl: 'url1' },
      { employeeId: 10, faceVector: '[1,0]', imageUrl: 'url2' }
    ]);
  });
});
