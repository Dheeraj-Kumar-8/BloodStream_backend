const { StatusCodes } = require('http-status-codes');
const BloodRequest = require('../models/bloodRequest.model');
const User = require('../models/user.model');
const Delivery = require('../models/delivery.model');
const { AppError } = require('../utils/errors');
const { isCompatible, compatibilityScore } = require('../utils/bloodCompatibility');
const { haversineDistanceKm } = require('../utils/geo');
const notificationService = require('./notification.service');

const ensureAccess = async (request, user) => {
	if (user.role === 'admin') return;
	if (user.role === 'recipient' && request.recipientId.equals(user._id)) return;
	if (user.role === 'donor') {
		const matched = (request.matches || []).some((match) => match.donorId?.equals(user._id));
		if (matched) return;
	}
	if (user.role === 'delivery') {
		if (request.deliveryId) {
			if (typeof request.deliveryId?.deliveryPersonId !== 'undefined') {
				if (request.deliveryId.deliveryPersonId?.equals(user._id)) return;
			} else {
				const delivery = await Delivery.findById(request.deliveryId);
				if (delivery?.deliveryPersonId?.equals(user._id)) return;
			}
		}
	}
	throw new AppError('Not authorized to access this request', StatusCodes.FORBIDDEN);
};

const createRequest = async (user, payload) => {
	if (!payload.bloodType || !payload.unitsNeeded) {
		throw new AppError('Blood type and units needed are required', StatusCodes.BAD_REQUEST);
	}

	const recipientId = user.role === 'admin' && payload.recipientId ? payload.recipientId : user._id;

	const request = await BloodRequest.create({
		recipientId,
		bloodType: payload.bloodType,
		unitsNeeded: payload.unitsNeeded,
		urgency: payload.urgency || 'medium',
		hospital: payload.hospital,
		notes: payload.notes,
	});

	await matchDonors(request._id);

	return getRequest(user, request._id);
};

const listRequests = async (user, { page = 1, limit = 20, status, urgency }) => {
	const query = {};

	if (user.role === 'recipient') {
		query.recipientId = user._id;
	}

	if (user.role === 'donor') {
		query.matches = { $elemMatch: { donorId: user._id } };
	}

	if (user.role === 'delivery') {
		const deliveries = await Delivery.find({
			deliveryPersonId: user._id,
		}).select('_id');
		const deliveryIds = deliveries.map((d) => d._id);
		if (deliveryIds.length === 0) {
			return {
				items: [],
				pagination: {
					page: Number(page),
					limit: Number(limit),
					total: 0,
					pages: 1,
				},
			};
		}
		query.deliveryId = { $in: deliveryIds };
	}

	if (status) {
		query.status = status;
	}
	if (urgency) {
		query.urgency = urgency;
	}

	const skip = (Number(page) - 1) * Number(limit);

	const [items, total] = await Promise.all([
		BloodRequest.find(query)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(Number(limit))
			.populate('recipientId', 'firstName lastName bloodType location')
			.populate('matches.donorId', 'firstName lastName bloodType availability location'),
		BloodRequest.countDocuments(query),
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

const getRequest = async (user, requestId) => {
	const request = await BloodRequest.findById(requestId)
		.populate('recipientId', 'firstName lastName bloodType location')
		.populate('matches.donorId', 'firstName lastName bloodType availability location')
		.populate('deliveryId');

	if (!request) {
		throw new AppError('Request not found', StatusCodes.NOT_FOUND);
	}

		await ensureAccess(request, user);

	return request;
};

const buildMatches = async (request) => {
	const recipient = await User.findById(request.recipientId);
	const coordinates =
		request.hospital?.location?.coordinates ||
		recipient?.location?.coordinates;

	if (!coordinates) {
		return [];
	}

	const donors = await User.find({
		role: 'donor',
		isVerified: true,
		bloodType: { $exists: true },
		'availability.isAvailable': true,
		'location.coordinates': {
			$near: {
				$geometry: { type: 'Point', coordinates },
				$maxDistance: 50 * 1000,
			},
		},
	}).limit(50);

	return donors
		.map((donor) => {
			if (!isCompatible(donor.bloodType, request.bloodType)) {
				return null;
			}
			const distance = haversineDistanceKm(
				coordinates,
				donor.location?.coordinates
			);
			return {
				donorId: donor._id,
				compatibilityScore: compatibilityScore(donor.bloodType, request.bloodType),
				distanceKm: distance,
				status: 'notified',
			};
		})
		.filter(Boolean)
		.sort((a, b) => b.compatibilityScore - a.compatibilityScore)
		.slice(0, 20);
};

const matchDonors = async (requestId) => {
	const request = await BloodRequest.findById(requestId);
	if (!request) {
		throw new AppError('Request not found', StatusCodes.NOT_FOUND);
	}

	const matches = await buildMatches(request);
	request.matches = matches;
	await request.save();

	await Promise.all(
		matches.map((match) =>
			notificationService.createNotification(match.donorId, {
				title: 'Potential donation match',
				message: `A recipient is requesting ${request.bloodType} blood (${request.urgency} urgency).`,
				category: 'alert',
				metadata: { requestId: request._id },
			})
		)
	);

	return request;
};

const escalateEmergency = async (requestId, user) => {
	const request = await BloodRequest.findById(requestId);
	if (!request) {
		throw new AppError('Request not found', StatusCodes.NOT_FOUND);
	}

		await ensureAccess(request, user);

	request.urgency = 'critical';
	request.emergencyEscalatedAt = new Date();
	await request.save();

	await notificationService.broadcastToRole('donor', {
		title: 'Emergency blood request',
		message: `Immediate ${request.bloodType} donation needed. Check assignments for details.`,
		category: 'alert',
		metadata: { requestId: request._id },
	});

	await Promise.all(
		(request.matches || []).map((match) =>
			notificationService.createNotification(match.donorId, {
				title: 'Emergency escalation',
				message: `Request ${request._id.toString()} has been escalated to critical. Immediate action required.`,
				category: 'alert',
				metadata: { requestId: request._id },
			})
		)
	);

	return request;
};

const acceptRequest = async (requestId, user) => {
	const request = await BloodRequest.findById(requestId);
	if (!request) {
		throw new AppError('Request not found', StatusCodes.NOT_FOUND);
	}

	if (user.role !== 'donor') {
		throw new AppError('Only donors can accept matches', StatusCodes.FORBIDDEN);
	}

	const match = (request.matches || []).find((m) => m.donorId.equals(user._id));
	if (!match) {
		throw new AppError('No match found for this donor', StatusCodes.NOT_FOUND);
	}

	match.status = 'accepted';
	match.respondedAt = new Date();
	request.status = 'matched';
	await request.save();

	await notificationService.createNotification(request.recipientId, {
		title: 'Donor accepted request',
		message: `${user.firstName} has accepted your blood request.`,
		category: 'update',
		metadata: { requestId: request._id, donorId: user._id },
	});

	const admins = await User.find({ role: 'admin' }).select('_id');
	await Promise.all(
		admins.map((admin) =>
			notificationService.createNotification(admin._id, {
				title: 'Donor match confirmed',
				message: `${user.firstName} accepted request ${request._id.toString()}.`,
				category: 'update',
				metadata: { requestId: request._id, donorId: user._id },
			})
		)
	);

	return request;
};

const declineRequest = async (requestId, user) => {
	const request = await BloodRequest.findById(requestId);
	if (!request) {
		throw new AppError('Request not found', StatusCodes.NOT_FOUND);
	}

	if (user.role !== 'donor') {
		throw new AppError('Only donors can decline matches', StatusCodes.FORBIDDEN);
	}

	const match = (request.matches || []).find((m) => m.donorId.equals(user._id));
	if (!match) {
		throw new AppError('No match found for this donor', StatusCodes.NOT_FOUND);
	}

	match.status = 'declined';
	match.respondedAt = new Date();
	await request.save();

	return request;
};

module.exports = {
	createRequest,
	listRequests,
	getRequest,
	matchDonors,
	escalateEmergency,
	acceptRequest,
	declineRequest,
};
