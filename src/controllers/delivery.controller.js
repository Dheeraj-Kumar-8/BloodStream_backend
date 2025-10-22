const deliveryService = require('../services/delivery.service');

const listDeliveries = async (req, res, next) => {
  try {
    const data = await deliveryService.listDeliveries(req.user, req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const createDelivery = async (req, res, next) => {
  try {
    const data = await deliveryService.createDelivery(req.body, req.user);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const getDelivery = async (req, res, next) => {
  try {
    const data = await deliveryService.getDelivery(req.params.deliveryId, req.user);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const data = await deliveryService.updateStatus(
      req.params.deliveryId,
      req.body,
      req.user
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const addTrackingEvent = async (req, res, next) => {
  try {
    const data = await deliveryService.addTrackingEvent(
      req.params.deliveryId,
      req.body,
      req.user
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listDeliveries,
  createDelivery,
  getDelivery,
  updateStatus,
  addTrackingEvent,
};
