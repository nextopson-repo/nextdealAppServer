import nodemailer from 'nodemailer';
import { env } from '@/common/utils/envConfig';

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE, 
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const sendEmailOTP = async (email: string, otp: string) => {
  try {
    const mailOptions = {
      from: env.SMTP_FROM,
      to: email,
      subject: 'Your OTP for Verification from Nextdeal',
      html: `
       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 8px;">
  <h2 style="color: #2c3e50; text-align: center;">Nextdeal - OTP Verification</h2>
  <p style="color: #333; font-size: 16px;">Dear user,</p>
  <p style="color: #333; font-size: 16px;">Your One-Time Password (OTP) for verification is:</p>

  <div style="background-color: #f4f4f4; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
    <h1 style="color: #2c3e50; margin: 0; font-size: 32px;">${otp}</h1>
  </div>

  <p style="color: #333; font-size: 16px;">This OTP is valid for 10 minutes. Please do not share it with anyone for security reasons.</p>
  <p style="color: #333; font-size: 16px;">If you didn’t request this OTP, you can safely ignore this email.</p>

  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;">

  <p style="color: #999; font-size: 12px; text-align: center;">This is an automated message from <strong>Nextdeal</strong>. Please do not reply to this email.</p>
</div>

      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}; 

export const sendEmailNotification = async (email:any, subject: string, body: any) => {
  try {
    const mailOptions = {
      from: env.SMTP_FROM,
      to: email,
      subject: subject,
      html: body,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

