const bloodBankService = require('../services/bloodbank.service');

const listBloodBanks = async (req, res, next) => {
  try {
    const data = await bloodBankService.listBloodBanks(req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const createBloodBank = async (req, res, next) => {
  try {
    const data = await bloodBankService.createBloodBank(req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const updateBloodBank = async (req, res, next) => {
  try {
    const data = await bloodBankService.updateBloodBank(req.params.bloodBankId, req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getBloodBank = async (req, res, next) => {
  try {
    const data = await bloodBankService.getBloodBank(req.params.bloodBankId);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listBloodBanks,
  createBloodBank,
  updateBloodBank,
  getBloodBank,
};
