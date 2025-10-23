const mongoose = require('mongoose');

// Normalize Indian phone numbers to +91XXXXXXXXXX
function normalizeIndianPhone(raw) {
  if (!raw) return raw;
  const digits = String(raw).replace(/\D/g, '');
  let d = digits.replace(/^0+/, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 10) return `+91${d}`;
  if (d.length === 11 && d.startsWith('91')) return `+${d}`;
  if (d.length === 12 && d.startsWith('91')) return `+${d}`;
  if (String(raw).trim().startsWith('+')) return String(raw).trim();
  return String(raw).trim();
}

const healthMetricSchema = new mongoose.Schema(
  {
    hemoglobin: Number,
    bloodPressureSystolic: Number,
    bloodPressureDiastolic: Number,
    pulse: Number,
    weight: Number,
    notes: String,
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
    },
    userAgent: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    addressLine: String,
    city: String,
    state: String,
    postalCode: String,
    coordinates: {
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
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          const n = normalizeIndianPhone(v);
          return /^\+91[6-9]\d{9}$/.test(n);
        },
        message: 'Invalid Indian mobile number',
      },
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['donor', 'recipient', 'delivery', 'admin'],
      required: true,
    },
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    location: locationSchema,
    availability: {
      isAvailable: {
        type: Boolean,
        default: true,
      },
      nextAvailableDate: Date,
      preferredDonationCenters: [String],
    },
    donorProfile: {
      lastDonationDate: Date,
      totalDonations: {
        type: Number,
        default: 0,
      },
      healthMetrics: [healthMetricSchema],
    },
    recipientProfile: {
      medicalNotes: String,
      emergencyContacts: [String],
    },
    deliveryProfile: {
      licenseId: String,
      vehicleType: String,
      maxDistanceKm: {
        type: Number,
        default: 25,
      },
      currentAssignments: {
        type: Number,
        default: 0,
      },
    },
    adminProfile: {
      permissions: {
        type: [String],
        default: ['manage_users', 'view_reports', 'manage_banks'],
      },
    },
    sessions: [sessionSchema],
    notificationPreferences: {
      emergencyAlerts: {
        type: Boolean,
        default: true,
      },
      emailUpdates: {
        type: Boolean,
        default: true,
      },
      smsUpdates: {
        type: Boolean,
        default: false,
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpVerifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.index({ 'location.coordinates': '2dsphere' });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);

// Ensure phone number is stored normalized
userSchema.pre('validate', function (next) {
  if (this.phoneNumber) {
    this.phoneNumber = normalizeIndianPhone(this.phoneNumber);
  }
  next();
});
