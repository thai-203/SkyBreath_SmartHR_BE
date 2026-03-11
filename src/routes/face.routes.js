import express from "express";
import {
  registerFace,
  getRegisteredFaces,
  getAllFaces,
  deleteFace,
  deleteFacesByEmployee,
} from "../controllers/face-data.controller.js";
import { checkIn } from "../controllers/attendance.controller";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { upload } from "../common/middleware/upload.middleware.js";

const router = express.Router();

// Admin endpoints
router.get("/", authMiddleware, getAllFaces);
router.delete("/:id", authMiddleware, deleteFace);
router.delete("/employee/:employeeId", authMiddleware, deleteFacesByEmployee);

// Require authentication for face registration and check-in
router.post("/register-faces", authMiddleware, upload.array("images", 10), registerFace);
router.post("/checkin", authMiddleware, upload.single("image"), checkIn);
router.get("/registered", authMiddleware, getRegisteredFaces);

export default router;