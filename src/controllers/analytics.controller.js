const analyticsService = require('../services/analytics.service');

const overview = async (req, res, next) => {
  try {
    const data = await analyticsService.overview();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const donorPerformance = async (req, res, next) => {
  try {
    const data = await analyticsService.donorPerformance();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const recipientInsights = async (req, res, next) => {
  try {
    const data = await analyticsService.recipientInsights();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const deliveryMetrics = async (req, res, next) => {
  try {
    const data = await analyticsService.deliveryMetrics();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  overview,
  donorPerformance,
  recipientInsights,
  deliveryMetrics,
};
