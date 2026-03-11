import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const ARC_FACE_URL = process.env.ARC_FACE_URL || 'http://localhost:8001';

export class ArcFaceService {
  async getEmbedding(imageBuffer) {
    const form = new FormData();
    form.append('file', imageBuffer, 'face.jpg');

    const res = await axios.post(`${ARC_FACE_URL}/embedding`, form, {
      headers: form.getHeaders(),
    });

    return res.data;
  }

  async verify(embedding1, embedding2) {
    const res = await axios.post(`${ARC_FACE_URL}/verify`, {
      embedding1,
      embedding2,
    });

    return res.data.similarity;
  }

  async registerFaces(files) {
    const form = new FormData();

    for (const file of files) {
      form.append('files', fs.createReadStream(file.path));
    }

    const res = await axios.post(`${ARC_FACE_URL}/register-validate`, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return res.data;
  }
}
