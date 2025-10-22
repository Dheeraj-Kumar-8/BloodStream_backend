const requestService = require('../services/request.service');

const createRequest = async (req, res, next) => {
  try {
    const data = await requestService.createRequest(req.user, req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const listRequests = async (req, res, next) => {
  try {
    const data = await requestService.listRequests(req.user, req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getRequest = async (req, res, next) => {
  try {
    const data = await requestService.getRequest(req.user, req.params.requestId);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const matchDonors = async (req, res, next) => {
  try {
    const data = await requestService.matchDonors(req.params.requestId);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const escalateEmergency = async (req, res, next) => {
  try {
    const data = await requestService.escalateEmergency(req.params.requestId, req.user);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const acceptRequest = async (req, res, next) => {
  try {
    const data = await requestService.acceptRequest(req.params.requestId, req.user);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const declineRequest = async (req, res, next) => {
  try {
    const data = await requestService.declineRequest(req.params.requestId, req.user);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  listRequests,
  getRequest,
  matchDonors,
  escalateEmergency,
  acceptRequest,
  declineRequest,
};
