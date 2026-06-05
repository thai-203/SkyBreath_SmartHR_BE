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

  it('1. Quăng lỗi "Không tìm thấy nhân viên" nếu không tìm thấy employee', async () => {
    mockEmployeeRepo.findByUserId.mockResolvedValue(null);

    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(NotFoundException);
    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow('Không tìm thấy nhân viên');
  });

  it('2. Quăng lỗi "Nhân viên đã đăng ký khuôn mặt" nếu nhân viên đã đăng ký khuôn mặt', async () => {
    mockEmployeeRepo.findByUserId.mockResolvedValue(mockEmployee);
    mockFaceDataRepo.findByEmployeeIdWithEmpInfo.mockResolvedValue({ id: 1 }); // Đã tồn tại

    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(BadRequestException);
    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow('Nhân viên đã đăng ký khuôn mặt');
  });

  it('3. Quăng lỗi "Vui lòng cung cấp ít nhất một ảnh để đăng ký khuôn mặt." nếu thiếu files', async () => {
    mockEmployeeRepo.findByUserId.mockResolvedValue(mockEmployee);
    mockFaceDataRepo.findByEmployeeIdWithEmpInfo.mockResolvedValue(null);

    await expect(service.registerFaces(mockUserId, [])).rejects.toThrow(BadRequestException);
    await expect(service.registerFaces(mockUserId, [])).rejects.toThrow('Vui lòng cung cấp ít nhất một ảnh để đăng ký khuôn mặt.');
  });

  it('4. should throw "AI Engine Error" if ArcFaceService returns a failure message', async () => {
    mockEmployeeRepo.findByUserId.mockResolvedValue(mockEmployee);
    mockFaceDataRepo.findByEmployeeIdWithEmpInfo.mockResolvedValue(null);
    mockConfigRepo.findOneConfig.mockResolvedValue(mockConfig);
    
    // Mock Microservice trả về fail
    mockArcFaceService.extractMulti.mockResolvedValue({ success: false, message: 'AI Engine Error' });

    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(BadRequestException);
    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow('AI Engine Error');
  });

  it('5. should throw "Ảnh chụp không đủ độ chân thực (nghi ngờ ảnh giả mạo). Vui lòng chụp ảnh người thật, rõ nét và trực diện hơn." if avg_liveness_score below threshold', async () => {
    mockEmployeeRepo.findByUserId.mockResolvedValue(mockEmployee);
    mockFaceDataRepo.findByEmployeeIdWithEmpInfo.mockResolvedValue(null);
    mockConfigRepo.findOneConfig.mockResolvedValue(mockConfig);
    
    mockArcFaceService.extractMulti.mockResolvedValue({ 
      success: true, 
      avg_liveness_score: 0.5 // Thấp hơn ngưỡng 0.8
    });

    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow(BadRequestException);
    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow('Ảnh chụp không đủ độ chân thực (nghi ngờ ảnh giả mạo). Vui lòng chụp ảnh người thật, rõ nét và trực diện hơn.');
  });

  it('6. should throw "Ảnh thứ 1 chứa nhiều khuôn mặt. Vui lòng đảm bảo chỉ có duy nhất khuôn mặt của bạn trong khung hình." if frame contains multiple faces', async () => {
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
    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow('Ảnh thứ 1 chứa nhiều khuôn mặt. Vui lòng đảm bảo chỉ có duy nhất khuôn mặt của bạn trong khung hình.');
  });

  it('7. should throw "Khuôn mặt trong ảnh thứ 1 quá nhỏ hoặc ở quá xa. Vui lòng đưa khuôn mặt lại gần camera hơn." if detected face is smaller than min size', async () => {
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
    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow('Khuôn mặt trong ảnh thứ 1 quá nhỏ hoặc ở quá xa. Vui lòng đưa khuôn mặt lại gần camera hơn.');
  });

  it('8. should throw "Khuôn mặt trong ảnh thứ 2 không khớp với ảnh đầu tiên. Vui lòng đảm bảo tất cả các ảnh đều là của cùng một người." if frames are from different people', async () => {
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
    await expect(service.registerFaces(mockUserId, mockFiles)).rejects.toThrow('Khuôn mặt trong ảnh thứ 2 không khớp với ảnh đầu tiên. Vui lòng đảm bảo tất cả các ảnh đều là của cùng một người.');
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
