import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const ARC_FACE_URL = process.env.ARC_FACE_URL || 'http://localhost:8000';

export class ArcFaceService {
  /**
   * Single frame — check-in/check-out SINGLE_FRAME mode.
   * @param {Buffer} imageBuffer
   */
  async extractSingle(imageBuffer) {
    const form = new FormData();
    form.append('file', imageBuffer, 'face.jpg');

    const res = await axios.post(`${ARC_FACE_URL}/extract`, form, {
      headers: form.getHeaders(),
    });

    return res.data;
  }

  /**
   * Multi frame — register và MULTI_FRAME liveness.
   * @param {Express.Multer.File[]} files
   */
  async extractMulti(files) {
    const form = new FormData();

    const streams = await Promise.all(
      files.map((file) => axios.get(file.path, { responseType: 'stream' })),
    );

    streams.forEach((res, index) => {
      form.append('files', res.data, `image-${index}.jpg`);
    });

    const response = await axios.post(`${ARC_FACE_URL}/extract-multi`, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return response.data;
  }
}
