/**
 * Tính Cosine Similarity giữa 2 vector.
 * Kết quả trong [-1, 1], càng gần 1 càng giống nhau.
 */
export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Tính L2 Similarity (Euclidean) giữa 2 vector.
 * Normalize về [0, 1] bằng 1/(1+distance), càng gần 1 càng giống nhau.
 */
export function l2Similarity(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return 1 / (1 + Math.sqrt(sum));
}

/**
 * Tính Dot Product Similarity giữa 2 vector.
 * Dùng khi embeddings đã được normalize sẵn (unit vector).
 */
export function dotSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Dispatch theo metric name.
 * @param {number[]} a
 * @param {number[]} b
 * @param {'cosine'|'l2'|'dot'} metric
 * @returns {number}
 */
export function computeSimilarity(a, b, metric = 'cosine') {
  switch (metric) {
    case 'l2':  return l2Similarity(a, b);
    case 'dot': return dotSimilarity(a, b);
    case 'cosine':
    default:    return cosineSimilarity(a, b);
  }
}