/* eslint-disable no-console */
const path = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const connectDatabase = require('../src/config/database');
const User = require('../src/models/user.model');
const BloodBank = require('../src/models/bloodBank.model');
const BloodRequest = require('../src/models/bloodRequest.model');
const Delivery = require('../src/models/delivery.model');
const Appointment = require('../src/models/appointment.model');
const Notification = require('../src/models/notification.model');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_PASSWORD = 'ChangeMe!123';

const coordinates = {
  nyc: [-73.985428, 40.748817],
  brooklyn: [-73.9442, 40.6782],
  queens: [-73.7949, 40.7282],
  jersey: [-74.0445, 40.6892],
  bronx: [-73.8648, 40.8448],
};

const inventoryTemplate = () => [
  { bloodType: 'O+', unitsAvailable: 10 },
  { bloodType: 'A+', unitsAvailable: 7 },
  { bloodType: 'B-', unitsAvailable: 3 },
  { bloodType: 'AB+', unitsAvailable: 2 },
];

const buildLocation = (coords, address) => ({
  addressLine: address,
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  coordinates: {
    type: 'Point',
    coordinates: coords,
  },
});

const buildTracking = (coords) => [
  {
    status: 'pending_pickup',
    location: { type: 'Point', coordinates: coords },
    notes: 'Awaiting donor arrival',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    status: 'in_transit',
    location: { type: 'Point', coordinates: coords.map((value, index) => value + (index ? 0.01 : 0.01)) },
    notes: 'Courier en route to hospital',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
  },
];

async function seed() {
  console.log('Seeding database with demo content...');
  await connectDatabase();

  await Promise.all([
    User.deleteMany({}),
    BloodBank.deleteMany({}),
    BloodRequest.deleteMany({}),
    Delivery.deleteMany({}),
    Appointment.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const [admin, donorA, donorB, recipient, deliveryUser] = await User.create([
    {
      firstName: 'Ariana',
      lastName: 'Lopez',
      email: 'admin@bloodstream.local',
      phoneNumber: '+15550000001',
      passwordHash,
      role: 'admin',
      isVerified: true,
      otpVerifiedAt: new Date(),
      adminProfile: {
        permissions: ['manage_users', 'view_reports', 'manage_banks'],
      },
    },
    {
      firstName: 'Noah',
      lastName: 'Patel',
      email: 'noah.donor@bloodstream.local',
      phoneNumber: '+15550000002',
      passwordHash,
      role: 'donor',
      bloodType: 'O+',
      isVerified: true,
      otpVerifiedAt: new Date(),
      donorProfile: {
        lastDonationDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45),
        totalDonations: 8,
      },
      availability: {
        isAvailable: true,
        preferredDonationCenters: ['Midtown Donation Center'],
      },
      location: buildLocation(coordinates.nyc, '420 5th Ave'),
    },
    {
      firstName: 'Leah',
      lastName: 'Kim',
      email: 'leah.donor@bloodstream.local',
      phoneNumber: '+15550000003',
      passwordHash,
      role: 'donor',
      bloodType: 'A+',
      isVerified: true,
      otpVerifiedAt: new Date(),
      donorProfile: {
        lastDonationDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 70),
        totalDonations: 5,
      },
      availability: {
        isAvailable: true,
        preferredDonationCenters: ['Brooklyn Medical Center'],
      },
      location: buildLocation(coordinates.brooklyn, '85 Flatbush Ave'),
    },
    {
      firstName: 'Maya',
      lastName: 'Singh',
      email: 'maya.recipient@bloodstream.local',
      phoneNumber: '+15550000004',
      passwordHash,
      role: 'recipient',
      bloodType: 'O+',
      isVerified: true,
      otpVerifiedAt: new Date(),
      recipientProfile: {
        medicalNotes: 'Requires frequent transfusions for Thalassemia.',
      },
      location: buildLocation(coordinates.queens, '44-01 23rd St'),
    },
    {
      firstName: 'Jordan',
      lastName: 'Reyes',
      email: 'jordan.delivery@bloodstream.local',
      phoneNumber: '+15550000005',
      passwordHash,
      role: 'delivery',
      isVerified: true,
      otpVerifiedAt: new Date(),
      deliveryProfile: {
        vehicleType: 'SUV',
        currentAssignments: 1,
      },
      location: buildLocation(coordinates.jersey, '1 Audrey Zapp Dr'),
    },
  ]);

  const banks = await BloodBank.create([
    {
      name: 'Midtown Donation Center',
      address: '200 Madison Ave, New York, NY',
      contactNumber: '(212) 555-0181',
      email: 'midtown@bloodstream.local',
      location: { type: 'Point', coordinates: coordinates.nyc },
      inventory: inventoryTemplate(),
    },
    {
      name: 'Brooklyn Lifeline',
      address: '141 Willoughby St, Brooklyn, NY',
      contactNumber: '(718) 555-0149',
      email: 'brooklyn@bloodstream.local',
      location: { type: 'Point', coordinates: coordinates.brooklyn },
      inventory: inventoryTemplate(),
    },
    {
      name: 'Queens Community Bank',
      address: '89-00 Sutphin Blvd, Jamaica, NY',
      contactNumber: '(347) 555-0104',
      email: 'queens@bloodstream.local',
      location: { type: 'Point', coordinates: coordinates.queens },
      inventory: inventoryTemplate(),
    },
  ]);

  const requestOne = await BloodRequest.create({
    recipientId: recipient._id,
    bloodType: 'O+',
    unitsNeeded: 3,
    urgency: 'critical',
    status: 'matched',
    hospital: {
      name: 'NY Presbyterian',
      address: '525 E 68th St, New York, NY',
      location: { type: 'Point', coordinates: coordinates.nyc },
    },
    notes: 'Patient scheduled for surgery at 8pm.',
    matches: [
      {
        donorId: donorA._id,
        compatibilityScore: 94,
        distanceKm: 2.1,
        status: 'accepted',
        respondedAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
      },
      {
        donorId: donorB._id,
        compatibilityScore: 88,
        distanceKm: 8.4,
        status: 'notified',
      },
    ],
  });

  const requestTwo = await BloodRequest.create({
    recipientId: recipient._id,
    bloodType: 'A+',
    unitsNeeded: 2,
    urgency: 'medium',
    status: 'completed',
    hospital: {
      name: 'Mount Sinai Queens',
      address: '25-10 30th Ave, Astoria, NY',
      location: { type: 'Point', coordinates: coordinates.queens },
    },
    notes: 'Post-op recovery transfusion.',
    matches: [
      {
        donorId: donorB._id,
        compatibilityScore: 91,
        distanceKm: 5.2,
        status: 'accepted',
        respondedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
      },
    ],
  });

  const deliveryOne = await Delivery.create({
    requestId: requestOne._id,
    donorId: donorA._id,
    recipientId: recipient._id,
    deliveryPersonId: deliveryUser._id,
    status: 'in_transit',
    pickupEta: new Date(Date.now() + 1000 * 60 * 60 * 3),
    dropoffEta: new Date(Date.now() + 1000 * 60 * 60 * 6),
    tracking: buildTracking(coordinates.nyc),
  });

  requestOne.deliveryId = deliveryOne._id;
  await requestOne.save();

  await Appointment.create([
    {
      donorId: donorA._id,
      bloodBankId: banks[0]._id,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      status: 'scheduled',
      notes: 'Standard donation appointment.',
    },
    {
      donorId: donorB._id,
      bloodBankId: banks[1]._id,
      scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      status: 'completed',
      notes: 'Completed successfully.',
    },
  ]);

  await Notification.create([
    {
      userId: donorA._id,
      title: 'Donation match confirmed',
      message: 'A courier is heading to collect the unit for Maya Singh.',
      category: 'assignment',
      metadata: { requestId: requestOne._id },
    },
    {
      userId: recipient._id,
      title: 'Emergency request escalated',
      message: 'Additional donors have been notified to fulfill your urgent request.',
      category: 'alert',
      metadata: { requestId: requestOne._id },
    },
    {
      userId: deliveryUser._id,
      title: 'Pickup scheduled',
      message: 'Collect the package from Midtown Donation Center by 6:45pm.',
      category: 'assignment',
      metadata: { deliveryId: deliveryOne._id },
    },
    {
      userId: admin._id,
      title: 'Inventory update needed',
      message: 'Brooklyn Lifeline inventory dropped below target for B- units.',
      category: 'reminder',
      metadata: { bloodBankId: banks[1]._id },
    },
    {
      userId: admin._id,
      title: 'Request completed',
      message: 'Request for A+ units has been fulfilled successfully.',
      category: 'update',
      metadata: { requestId: requestTwo._id },
    },
  ]);

  console.log('Seed data ready!');
  console.table([
    { role: 'Admin', email: admin.email, password: DEFAULT_PASSWORD },
    { role: 'Donor', email: donorA.email, password: DEFAULT_PASSWORD },
    { role: 'Delivery', email: deliveryUser.email, password: DEFAULT_PASSWORD },
    { role: 'Recipient', email: recipient.email, password: DEFAULT_PASSWORD },
  ]);

  await Promise.all([
    User.syncIndexes(),
    BloodBank.syncIndexes(),
    BloodRequest.syncIndexes(),
    Delivery.syncIndexes(),
    Appointment.syncIndexes(),
    Notification.syncIndexes(),
  ]);

  console.log('All indexes synced. You can now explore the dashboards with seeded data.');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Failed to seed database', error);
  process.exit(1);
});
