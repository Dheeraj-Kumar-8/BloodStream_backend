const mongoose = require('mongoose');

const deliveryStatus = ['pending_pickup', 'in_transit', 'delivered', 'cancelled'];

const trackingEventSchema = new mongoose.Schema(
  {
    status: String,
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
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const deliverySchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deliveryPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: deliveryStatus,
      default: 'pending_pickup',
    },
    pickupEta: Date,
    dropoffEta: Date,
    tracking: [trackingEventSchema],
  },
  {
    timestamps: true,
  }
);

deliverySchema.index({ deliveryPersonId: 1, status: 1 });

deliverySchema.methods.addTrackingEvent = function (status, coordinates = [0, 0], notes = '') {
  this.tracking.push({ status, location: { type: 'Point', coordinates }, notes });
  return this.save();
};

module.exports = mongoose.model('Delivery', deliverySchema);
