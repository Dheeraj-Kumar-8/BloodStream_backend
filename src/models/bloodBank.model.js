const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    unitsAvailable: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const bloodBankSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    address: String,
    contactNumber: String,
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
    partnerships: [String],
    inventory: [inventorySchema],
  },
  { timestamps: true }
);

bloodBankSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('BloodBank', bloodBankSchema);
