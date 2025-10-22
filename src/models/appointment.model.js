const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bloodBankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodBank',
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
    },
    notes: String,
  },
  { timestamps: true }
);

appointmentSchema.index({ donorId: 1, scheduledAt: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
