const User = require('../models/user.model');
const BloodRequest = require('../models/bloodRequest.model');
const Delivery = require('../models/delivery.model');
const Appointment = require('../models/appointment.model');

const overview = async () => {
  const [userCounts, requestCounts, deliveryCounts, appointmentCounts] = await Promise.all([
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    BloodRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Delivery.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  return {
    users: userCounts,
    requests: requestCounts,
    deliveries: deliveryCounts,
    appointments: appointmentCounts,
  };
};

const donorPerformance = async () => {
  const donors = await User.find({ role: 'donor' })
    .sort({ 'donorProfile.totalDonations': -1 })
    .limit(10)
    .select('firstName lastName bloodType donorProfile.totalDonations donorProfile.lastDonationDate');

  const availability = await User.aggregate([
    { $match: { role: 'donor' } },
    {
      $group: {
        _id: '$availability.isAvailable',
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    topDonors: donors,
    availability,
  };
};

const recipientInsights = async () => {
  const pipeline = [
    {
      $group: {
        _id: '$recipientId',
        totalRequests: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'recipient',
      },
    },
    { $unwind: '$recipient' },
    {
      $project: {
        _id: 1,
        recipient: {
          firstName: '$recipient.firstName',
          lastName: '$recipient.lastName',
        },
        totalRequests: 1,
        completed: 1,
        successRate: {
          $cond: [
            { $eq: ['$totalRequests', 0] },
            0,
            { $divide: ['$completed', '$totalRequests'] },
          ],
        },
      },
    },
    { $sort: { successRate: -1 } },
    { $limit: 10 },
  ];

  return BloodRequest.aggregate(pipeline);
};

const deliveryMetrics = async () => {
  const metrics = await Delivery.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } },
      },
    },
  ]);

  return metrics.map((metric) => ({
    status: metric._id,
    count: metric.count,
    avgDurationMinutes: metric.avgDuration ? metric.avgDuration / (1000 * 60) : null,
  }));
};

module.exports = {
  overview,
  donorPerformance,
  recipientInsights,
  deliveryMetrics,
};
