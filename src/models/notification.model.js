const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: String,
    message: String,
    category: {
      type: String,
      enum: ['alert', 'reminder', 'update', 'assignment'],
      default: 'update',
    },
    metadata: mongoose.Schema.Types.Mixed,
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
