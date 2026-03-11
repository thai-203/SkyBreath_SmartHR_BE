import { AttendanceRecordEntity } from "../models/entities/attendance-record.entity";
import { FaceDataEntity } from "../models/entities/face-data.entity";
import { ArcFaceService } from "../services/arcface.service";
import { FaceRecognitionConfigService } from "../services/face-recognition-config.service.js";

const arcface = new ArcFaceService();
const faceConfigService = new FaceRecognitionConfigService();

export const checkIn = async (req, res) => {

  const image = req.file.buffer;

  const config = await faceConfigService.getConfig();
  const maxFacesAllowed = config?.maxFacesAllowed ?? 1;

  const result = await arcface.getEmbedding(image);

  if (!result.success) {
    return res.status(400).json({
      message: result.message || "Face not detected",
    });
  }

  if (result.faces > maxFacesAllowed) {
    return res.status(400).json({
      message: `Vui lòng chỉ có tối đa ${maxFacesAllowed} khuôn mặt trong khung hình`,
    });
  }

  const inputEmbedding = result.embeddings[0];

  const faces = await FaceDataEntity.find();

  let bestMatch = null;
  let bestScore = 0;

  for (const face of faces) {

    const storedEmbedding = JSON.parse(face.faceVector);

    const similarity = await arcface.verify(
      inputEmbedding,
      storedEmbedding
    );

    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = face;
    }
  }

  if (bestScore < 0.5) {
    return res.status(401).json({
      message: "Face not recognized"
    });
  }

  const attendance = new AttendanceRecordEntity();
  attendance.employeeId = bestMatch.employeeId;
  attendance.checkInTime = new Date();

  await attendance.save();

  res.json({
    success: true,
    similarity: bestScore
  });
};