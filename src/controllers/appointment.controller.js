const appointmentService = require('../services/appointment.service');

const createAppointment = async (req, res, next) => {
  try {
    const data = await appointmentService.createAppointment(req.user, req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const listAppointments = async (req, res, next) => {
  try {
    const data = await appointmentService.listAppointments(req.user, req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const updateAppointment = async (req, res, next) => {
  try {
    const data = await appointmentService.updateAppointment(
      req.params.appointmentId,
      req.body,
      req.user
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAppointment,
  listAppointments,
  updateAppointment,
};
