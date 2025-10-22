const { StatusCodes } = require('http-status-codes');
const Notification = require('../models/notification.model');
const { AppError } = require('../utils/errors');
const { emitToUser, emitToRole } = require('../utils/socket');

const listNotifications = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Notification.countDocuments({ userId }),
  ]);

  return {
    items,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

const markRead = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new AppError('Notification not found', StatusCodes.NOT_FOUND);
  }

  return notification;
};

const markAllRead = async (userId) => {
  await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  return { message: 'All notifications marked as read' };
};

const createNotification = async (userId, payload) => {
  const notification = await Notification.create({ userId, ...payload });
  emitToUser(userId, 'notification:new', notification);
  return notification;
};

const broadcastToRole = async (role, payload) => {
  emitToRole(role, 'notification:broadcast', payload);
};

module.exports = {
  listNotifications,
  markRead,
  markAllRead,
  createNotification,
  broadcastToRole,
};
