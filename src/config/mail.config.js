import nodemailer from 'nodemailer';
import { config } from './env.config';

export const transporter = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  secure: config.mail.secure === true,
  auth: {
    user: config.mail.user,
    pass: config.mail.password,
  },
});
