const mongoose = require('mongoose');

const requestStatus = ['pending', 'matched', 'in_transit', 'completed', 'cancelled'];
const urgencyLevels = ['low', 'medium', 'high', 'critical'];

const matchSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    compatibilityScore: Number,
    distanceKm: Number,
    status: {
      type: String,
      enum: ['notified', 'accepted', 'declined'],
      default: 'notified',
    },
    respondedAt: Date,
  },
  { _id: false }
);

const bloodRequestSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    unitsNeeded: {
      type: Number,
      default: 1,
    },
    urgency: {
      type: String,
      enum: urgencyLevels,
      default: 'medium',
    },
    hospital: {
      name: String,
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
      address: String,
    },
    status: {
      type: String,
      enum: requestStatus,
      default: 'pending',
    },
    notes: String,
    matches: [matchSchema],
    deliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Delivery',
    },
    emergencyEscalatedAt: Date,
  },
  {
    timestamps: true,
  }
);

bloodRequestSchema.index({ status: 1, urgency: 1 });
bloodRequestSchema.index({ 'hospital.location': '2dsphere' });

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
