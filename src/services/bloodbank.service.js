const { StatusCodes } = require('http-status-codes');
const BloodBank = require('../models/bloodBank.model');
const { AppError } = require('../utils/errors');
const { haversineDistanceKm } = require('../utils/geo');

const listBloodBanks = async ({ latitude, longitude, radiusKm = 50, search }) => {
  const query = {};
  if (search) {
    query.name = new RegExp(search, 'i');
  }

  let banks;
  if (latitude && longitude) {
    const coordinates = [Number(longitude), Number(latitude)];
    banks = await BloodBank.find({
      ...query,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates },
          $maxDistance: Number(radiusKm) * 1000,
        },
      },
    });
    return banks.map((bank) => ({
      ...bank.toObject(),
      distanceKm: haversineDistanceKm(coordinates, bank.location?.coordinates),
    }));
  }

  banks = await BloodBank.find(query).sort({ name: 1 });
  return banks;
};

const createBloodBank = async (payload) => {
  const bank = await BloodBank.create(payload);
  return bank;
};

const updateBloodBank = async (bloodBankId, payload) => {
  const bank = await BloodBank.findByIdAndUpdate(bloodBankId, payload, {
    new: true,
    runValidators: true,
  });
  if (!bank) {
    throw new AppError('Blood bank not found', StatusCodes.NOT_FOUND);
  }
  return bank;
};

const getBloodBank = async (bloodBankId) => {
  const bank = await BloodBank.findById(bloodBankId);
  if (!bank) {
    throw new AppError('Blood bank not found', StatusCodes.NOT_FOUND);
  }
  return bank;
};

module.exports = {
  listBloodBanks,
  createBloodBank,
  updateBloodBank,
  getBloodBank,
};
