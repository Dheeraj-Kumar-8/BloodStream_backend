const nodemailer = require('nodemailer');

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Boolean(process.env.SMTP_SECURE === 'true'),
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    })
  : null;

const sendEmail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    console.info('SMTP not configured. Email content:', { to, subject, text });
    return;
  }
  await transporter.sendMail({ from: process.env.SMTP_FROM || 'no-reply@bloodstream.com', to, subject, text, html });
};

const sendSms = async ({ to, message }) => {
  console.info('SMS dispatch placeholder', { to, message });
};

module.exports = {
  sendEmail,
  sendSms,
};
