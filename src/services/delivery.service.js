const { StatusCodes } = require('http-status-codes');
const Delivery = require('../models/delivery.model');
const BloodRequest = require('../models/bloodRequest.model');
const User = require('../models/user.model');
const { AppError } = require('../utils/errors');
const notificationService = require('./notification.service');

const listDeliveries = async (user, { page = 1, limit = 20, status }) => {
  const query = {};

  if (status) {
    query.status = status;
  }

  if (user.role === 'delivery') {
    query.deliveryPersonId = user._id;
  }

  if (user.role === 'donor') {
    query.donorId = user._id;
  }

  if (user.role === 'recipient') {
    query.recipientId = user._id;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    Delivery.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('requestId')
      .populate('deliveryPersonId', 'firstName lastName phoneNumber')
      .populate('donorId', 'firstName lastName phoneNumber')
      .populate('recipientId', 'firstName lastName phoneNumber'),
    Delivery.countDocuments(query),
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

const createDelivery = async (payload, user) => {
  if (user.role !== 'admin') {
    throw new AppError('Only admins can create deliveries', StatusCodes.FORBIDDEN);
  }

  const request = await BloodRequest.findById(payload.requestId);
  if (!request) {
    throw new AppError('Request not found', StatusCodes.NOT_FOUND);
  }

  if (!payload.deliveryPersonId) {
    throw new AppError('Delivery person is required', StatusCodes.BAD_REQUEST);
  }

  let donorId = payload.donorId;
  if (!donorId) {
    const acceptedMatch = (request.matches || []).find((match) => match.status === 'accepted');
    donorId = acceptedMatch?.donorId;
  }

  if (!donorId) {
    throw new AppError('Unable to determine donor for delivery', StatusCodes.BAD_REQUEST);
  }

  const delivery = await Delivery.create({
    requestId: request._id,
    donorId,
    recipientId: request.recipientId,
    deliveryPersonId: payload.deliveryPersonId,
    pickupEta: payload.pickupEta,
    dropoffEta: payload.dropoffEta,
  });

  request.deliveryId = delivery._id;
  request.status = 'in_transit';
  await request.save();

  await notificationService.createNotification(payload.deliveryPersonId, {
    title: 'New delivery assignment',
    message: 'You have been assigned to transport a blood donation.',
    category: 'assignment',
    metadata: { deliveryId: delivery._id, requestId: request._id },
  });

  if (delivery.donorId) {
    await notificationService.createNotification(delivery.donorId, {
      title: 'Delivery scheduled',
      message: 'Logistics team is arranging pickup for your donation.',
      category: 'update',
      metadata: { deliveryId: delivery._id, requestId: request._id },
    });
  }

  if (delivery.recipientId) {
    await notificationService.createNotification(delivery.recipientId, {
      title: 'Delivery scheduled',
      message: 'A courier has been assigned to deliver your blood request.',
      category: 'update',
      metadata: { deliveryId: delivery._id, requestId: request._id },
    });
  }

  return delivery;
};

const getDelivery = async (deliveryId, user) => {
  const delivery = await Delivery.findById(deliveryId)
    .populate('requestId')
    .populate('deliveryPersonId', 'firstName lastName phoneNumber')
    .populate('donorId', 'firstName lastName phoneNumber')
    .populate('recipientId', 'firstName lastName phoneNumber');

  if (!delivery) {
    throw new AppError('Delivery not found', StatusCodes.NOT_FOUND);
  }

  if (
    user.role !== 'admin' &&
    !delivery.deliveryPersonId?._id?.equals(user._id) &&
    !delivery.donorId?._id?.equals(user._id) &&
    !delivery.recipientId?._id?.equals(user._id)
  ) {
    throw new AppError('Not authorized to view delivery', StatusCodes.FORBIDDEN);
  }

  return delivery;
};

const updateStatus = async (deliveryId, payload, user) => {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    throw new AppError('Delivery not found', StatusCodes.NOT_FOUND);
  }

  if (user.role !== 'admin' && !delivery.deliveryPersonId?.equals(user._id)) {
    throw new AppError('Not authorized to update status', StatusCodes.FORBIDDEN);
  }

  delivery.status = payload.status || delivery.status;
  if (payload.pickupEta) delivery.pickupEta = payload.pickupEta;
  if (payload.dropoffEta) delivery.dropoffEta = payload.dropoffEta;
  await delivery.save();

  const request = await BloodRequest.findById(delivery.requestId);
  if (request) {
    if (delivery.status === 'delivered') {
      request.status = 'completed';
      if (delivery.donorId) {
        const donor = await User.findById(delivery.donorId);
        if (donor) {
          donor.donorProfile = donor.donorProfile || {};
          donor.donorProfile.totalDonations = (donor.donorProfile.totalDonations || 0) + 1;
          donor.donorProfile.lastDonationDate = new Date();
          await donor.save();
        }
      }
    } else if (delivery.status === 'cancelled') {
      request.status = 'cancelled';
    }
    await request.save();
  }

  const notifyPayload = {
    title: 'Delivery status update',
    message: `Delivery status updated to ${delivery.status}.`,
    category: 'update',
    metadata: { deliveryId, requestId: delivery.requestId },
  };

  if (delivery.recipientId) {
    await notificationService.createNotification(delivery.recipientId, notifyPayload);
  }
  if (delivery.donorId) {
    await notificationService.createNotification(delivery.donorId, notifyPayload);
  }

  return delivery;
};

const addTrackingEvent = async (deliveryId, payload, user) => {
  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    throw new AppError('Delivery not found', StatusCodes.NOT_FOUND);
  }

  if (user.role !== 'admin' && !delivery.deliveryPersonId?.equals(user._id)) {
    throw new AppError('Not authorized to add tracking', StatusCodes.FORBIDDEN);
  }

  const updated = await delivery.addTrackingEvent(
    payload.status || delivery.status,
    payload.coordinates,
    payload.notes
  );

  await notificationService.createNotification(delivery.recipientId, {
    title: 'Delivery update',
    message: `Delivery status updated to ${payload.status || delivery.status}.`,
    category: 'update',
    metadata: { deliveryId },
  });

  if (delivery.donorId) {
    await notificationService.createNotification(delivery.donorId, {
      title: 'Delivery update',
      message: `Tracking update: ${payload.status || delivery.status}.`,
      category: 'update',
      metadata: { deliveryId },
    });
  }

  return updated;
};

module.exports = {
  listDeliveries,
  createDelivery,
  getDelivery,
  updateStatus,
  addTrackingEvent,
};
