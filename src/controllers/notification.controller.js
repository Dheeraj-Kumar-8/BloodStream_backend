const notificationService = require('../services/notification.service');

const listNotifications = async (req, res, next) => {
  try {
    const data = await notificationService.listNotifications(req.user._id, req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    const data = await notificationService.markRead(req.user._id, req.params.notificationId);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const data = await notificationService.markAllRead(req.user._id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listNotifications,
  markRead,
  markAllRead,
};
