const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    channel: {
      type: String,
      enum: ['sms', 'email'],
      default: 'sms',
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.index({ userId: 1, expiresAt: 1 });

module.exports = mongoose.model('OtpCode', otpSchema);
