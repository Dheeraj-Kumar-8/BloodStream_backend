const userService = require('../services/user.service');

const me = async (req, res, next) => {
  try {
    const data = await userService.getSelf(req.user._id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const data = await userService.updateProfile(req.user._id, req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getHealthMetrics = async (req, res, next) => {
  try {
    const data = await userService.getHealthMetrics(req.user._id, req.query.limit);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const addHealthMetric = async (req, res, next) => {
  try {
    const data = await userService.addHealthMetric(req.user._id, req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const data = await userService.listUsers(req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const nearbyDonors = async (req, res, next) => {
  try {
    const data = await userService.findNearbyDonors(req.query, req.user);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const donorAvailability = async (req, res, next) => {
  try {
    const data = await userService.donorAvailabilitySummary();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  me,
  updateProfile,
  getHealthMetrics,
  addHealthMetric,
  listUsers,
  nearbyDonors,
  donorAvailability,
};
