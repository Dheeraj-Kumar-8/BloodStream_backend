const { StatusCodes } = require('http-status-codes');
const User = require('../models/user.model');
const { AppError } = require('../utils/errors');
const { isCompatible, compatibilityScore } = require('../utils/bloodCompatibility');
const { haversineDistanceKm } = require('../utils/geo');

const sanitizeUser = (userDoc) => {
  const user = userDoc.toObject ? userDoc.toObject() : userDoc;
  delete user.passwordHash;
  delete user.sessions;
  return user;
};

const getHealthMetrics = async (userId, limit = 10) => {
  const user = await User.findById(userId).select('donorProfile.healthMetrics');
  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND);
  }

  const metrics = [...(user.donorProfile?.healthMetrics || [])]
    .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
    .slice(0, Number(limit));

  return metrics;
};

const addHealthMetric = async (userId, payload) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND);
  }

  if (user.role !== 'donor') {
    throw new AppError('Health metrics available to donors only', StatusCodes.FORBIDDEN);
  }

  user.donorProfile = user.donorProfile || {};
  user.donorProfile.healthMetrics = user.donorProfile.healthMetrics || [];
  user.donorProfile.healthMetrics.push({
    hemoglobin: payload.hemoglobin,
    bloodPressureSystolic: payload.bloodPressureSystolic,
    bloodPressureDiastolic: payload.bloodPressureDiastolic,
    pulse: payload.pulse,
    weight: payload.weight,
    notes: payload.notes,
    recordedAt: payload.recordedAt || new Date(),
  });

  await user.save();
  return user.donorProfile.healthMetrics.slice(-1)[0];
};

const getSelf = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND);
  }
  return sanitizeUser(user);
};

const updateProfile = async (userId, payload) => {
  const allowedFields = [
    'firstName',
    'lastName',
    'phoneNumber',
    'notificationPreferences',
    'location',
    'availability',
    'donorProfile',
    'recipientProfile',
    'deliveryProfile',
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      updates[field] = payload[field];
    }
  });

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND);
  }

  return sanitizeUser(user);
};

const listUsers = async ({ role, search, page = 1, limit = 20 }) => {
  const query = {};
  if (role) {
    query.role = role;
  }

  if (search) {
    query.$or = [
      { firstName: new RegExp(search, 'i') },
      { lastName: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { phoneNumber: new RegExp(search, 'i') },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-passwordHash -sessions'),
    User.countDocuments(query),
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

const findNearbyDonors = async (query, requester) => {
  const {
    latitude,
    longitude,
    radiusKm = 25,
    recipientBloodType,
    limit = 25,
  } = query;

  const coordinates = requester?.location?.coordinates ||
    (latitude && longitude ? [Number(longitude), Number(latitude)] : null);

  if (!coordinates) {
    throw new AppError(
      'Location is required to find nearby donors',
      StatusCodes.BAD_REQUEST
    );
  }

  const donors = await User.find({
    role: 'donor',
    isVerified: true,
    'availability.isAvailable': true,
    'location.coordinates': {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: Number(radiusKm) * 1000,
      },
    },
  })
    .limit(Number(limit))
    .select('-passwordHash -sessions');

  return donors
    .map((donor) => {
  const distanceKm = haversineDistanceKm(coordinates, donor.location?.coordinates);
      const compatible = recipientBloodType
        ? isCompatible(donor.bloodType, recipientBloodType)
        : true;
      const score = recipientBloodType
        ? compatibilityScore(donor.bloodType, recipientBloodType)
        : 0.5;

      return {
        ...sanitizeUser(donor),
        distanceKm,
        compatible,
        compatibilityScore: score,
      };
    })
    .filter((donor) => donor.compatible)
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
};

const donorAvailabilitySummary = async () => {
  const [summary, topDonors] = await Promise.all([
    User.aggregate([
      { $match: { role: 'donor' } },
      {
        $group: {
          _id: '$availability.isAvailable',
          count: { $sum: 1 },
        },
      },
    ]),
    User.find({ role: 'donor' })
      .sort({ 'donorProfile.totalDonations': -1 })
      .limit(5)
      .select('firstName lastName donorProfile.totalDonations bloodType'),
  ]);

  const availability = {
    available: 0,
    unavailable: 0,
  };

  summary.forEach((item) => {
    if (item._id) {
      availability.available = item.count;
    } else {
      availability.unavailable = item.count;
    }
  });

  return {
    availability,
    topDonors,
  };
};

module.exports = {
  getSelf,
  updateProfile,
  listUsers,
  findNearbyDonors,
  donorAvailabilitySummary,
  getHealthMetrics,
  addHealthMetric,
};
