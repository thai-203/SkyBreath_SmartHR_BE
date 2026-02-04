import * as bcrypt from 'bcrypt';
import crypto from 'crypto';

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const hashRefreshToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

export const compareRefreshToken = (refreshTokenDb, refreshToken) => {
  const hashedToken = hashRefreshToken(refreshToken);
  return hashedToken === refreshTokenDb;
};

export const hashResetPasswordToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const compareResetPasswordToken = (resetTokenRedis, resetToken) => {
  const hashedToken = hashResetPasswordToken(resetToken);
  return hashedToken === resetTokenRedis;
};
