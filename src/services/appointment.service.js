const { StatusCodes } = require('http-status-codes');
const Appointment = require('../models/appointment.model');
const BloodBank = require('../models/bloodBank.model');
const { AppError } = require('../utils/errors');
const notificationService = require('./notification.service');

const createAppointment = async (user, payload) => {
  if (user.role !== 'donor' && user.role !== 'admin') {
    throw new AppError('Only donors or admins can schedule appointments', StatusCodes.FORBIDDEN);
  }

  const donorId = user.role === 'admin' ? payload.donorId : user._id;

  const bank = await BloodBank.findById(payload.bloodBankId);
  if (!bank) {
    throw new AppError('Blood bank not found', StatusCodes.NOT_FOUND);
  }

  const scheduleDate = new Date(payload.scheduledAt);
  const dayStart = new Date(scheduleDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(scheduleDate);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await Appointment.findOne({
    donorId,
    scheduledAt: { $gte: dayStart, $lte: dayEnd },
  });

  if (existing) {
    throw new AppError('Donor already has an appointment on this day', StatusCodes.CONFLICT);
  }

  const appointment = await Appointment.create({
    donorId,
    bloodBankId: payload.bloodBankId,
  scheduledAt: scheduleDate,
    notes: payload.notes,
  });

  await notificationService.createNotification(donorId, {
    title: 'Appointment scheduled',
    message: `Your appointment at ${bank.name} is scheduled for ${new Date(
      payload.scheduledAt
    ).toLocaleString()}.`,
    category: 'reminder',
    metadata: { appointmentId: appointment._id },
  });

  return appointment;
};

const listAppointments = async (user, { page = 1, limit = 20, status, donorId }) => {
  const query = {};

  if (status) {
    query.status = status;
  }

  if (user.role === 'donor') {
    query.donorId = user._id;
  } else if (user.role === 'admin' && donorId) {
    query.donorId = donorId;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    Appointment.find(query)
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('bloodBankId'),
    Appointment.countDocuments(query),
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

const updateAppointment = async (appointmentId, payload, user) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new AppError('Appointment not found', StatusCodes.NOT_FOUND);
  }

  if (user.role !== 'admin' && !appointment.donorId.equals(user._id)) {
    throw new AppError('Not authorized to update appointment', StatusCodes.FORBIDDEN);
  }

  if (payload.status) appointment.status = payload.status;
  if (payload.scheduledAt) {
    const newDate = new Date(payload.scheduledAt);
    const dayStart = new Date(newDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(newDate);
    dayEnd.setHours(23, 59, 59, 999);

    const conflict = await Appointment.findOne({
      _id: { $ne: appointmentId },
      donorId: appointment.donorId,
      scheduledAt: { $gte: dayStart, $lte: dayEnd },
    });

    if (conflict) {
      throw new AppError('Donor already has an appointment on this day', StatusCodes.CONFLICT);
    }

    appointment.scheduledAt = newDate;
  }
  if (payload.notes !== undefined) appointment.notes = payload.notes;
  await appointment.save();

  return appointment;
};

module.exports = {
  createAppointment,
  listAppointments,
  updateAppointment,
};
