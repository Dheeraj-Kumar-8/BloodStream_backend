const bcrypt = require('bcryptjs');
const { StatusCodes } = require('http-status-codes');
const User = require('../models/user.model');
const OtpCode = require('../models/otp.model');
const { AppError } = require('../utils/errors');
const { generateNumericOtp, hashOtp, compareOtp } = require('../utils/otp');
const { createAuthTokens, verifyToken } = require('../utils/jwt');
const messagingService = require('./messaging.service');

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);

const sanitizeUser = (user) => {
  const sanitized = user.toObject ? user.toObject() : { ...user };
  delete sanitized.passwordHash;
  delete sanitized.sessions;
  return sanitized;
};

const buildCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  };
};

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  const baseOptions = buildCookieOptions();
  res.cookie('accessToken', accessToken, {
    ...baseOptions,
    maxAge: 30 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    ...baseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const register = async (payload) => {
  const {
    email,
    phoneNumber,
    password,
    role,
    firstName,
    lastName,
    bloodType,
    location,
  } = payload;

  if (!email || !phoneNumber || !password || !role) {
    throw new AppError('Missing registration fields', StatusCodes.BAD_REQUEST);
  }

  const existing = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { phoneNumber }],
  });

  if (existing) {
    throw new AppError('User already exists with provided email or phone', StatusCodes.CONFLICT);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    phoneNumber,
    role,
    passwordHash,
    bloodType,
    location,
    donorProfile: role === 'donor' ? {} : undefined,
    recipientProfile: role === 'recipient' ? {} : undefined,
    deliveryProfile: role === 'delivery' ? {} : undefined,
    adminProfile: role === 'admin' ? {} : undefined,
  });

  const otpResult = await sendOtp({
    userId: user._id,
    channel: user.email ? 'email' : 'sms',
  });

  return {
    message: 'Registration successful. OTP sent for verification.',
    user: sanitizeUser(user),
    otp: otpResult.debugCode,
  };
};

const sendOtp = async ({ email, phoneNumber, userId, channel = 'sms' }) => {
  let user = null;

  if (userId) {
    user = await User.findById(userId);
  } else if (email || phoneNumber) {
    user = await User.findOne({
      ...(email ? { email: email.toLowerCase() } : {}),
      ...(phoneNumber ? { phoneNumber } : {}),
    });
  }

  if (!user) {
    throw new AppError('User not found for OTP generation', StatusCodes.NOT_FOUND);
  }

  const otp = generateNumericOtp();
  const codeHash = await hashOtp(otp);

  await OtpCode.findOneAndDelete({ userId: user._id });
  await OtpCode.create({
    userId: user._id,
    codeHash,
    channel,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
  });

  const message = `Your BloodStream verification code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`;
  if (channel === 'email' && user.email) {
    await messagingService.sendEmail({
      to: user.email,
      subject: 'BloodStream Verification Code',
      text: message,
      html: `<p>${message}</p>`,
    });
  } else if (user.phoneNumber) {
    await messagingService.sendSms({ to: user.phoneNumber, message });
  }

  const response = { message: 'OTP generated and dispatched.' };
  if (process.env.NODE_ENV !== 'production') {
    response.debugCode = otp;
  }
  return response;
};

const verifyOtp = async ({ email, phoneNumber, userId, code }, req, res) => {
  if (!code) {
    throw new AppError('OTP code is required', StatusCodes.BAD_REQUEST);
  }

  let user = null;
  if (userId) {
    user = await User.findById(userId);
  } else if (email || phoneNumber) {
    user = await User.findOne({
      ...(email ? { email: email.toLowerCase() } : {}),
      ...(phoneNumber ? { phoneNumber } : {}),
    });
  }

  if (!user) {
    throw new AppError('User not found for OTP verification', StatusCodes.NOT_FOUND);
  }

  const otpDoc = await OtpCode.findOne({ userId: user._id });

  if (!otpDoc) {
    throw new AppError('OTP expired or not requested', StatusCodes.BAD_REQUEST);
  }

  if (otpDoc.expiresAt < new Date()) {
    await OtpCode.deleteOne({ _id: otpDoc._id });
    throw new AppError('OTP expired. Please request a new one.', StatusCodes.BAD_REQUEST);
  }

  if (otpDoc.attempts >= OTP_MAX_ATTEMPTS) {
    await OtpCode.deleteOne({ _id: otpDoc._id });
    throw new AppError('OTP attempts exceeded. Request a new code.', StatusCodes.FORBIDDEN);
  }

  const isValid = await compareOtp(code, otpDoc.codeHash);

  if (!isValid) {
    otpDoc.attempts += 1;
    await otpDoc.save();
    throw new AppError('Invalid OTP code', StatusCodes.UNAUTHORIZED);
  }

  user.isVerified = true;
  user.otpVerifiedAt = new Date();
  await user.save();
  await OtpCode.deleteOne({ _id: otpDoc._id });

  // After successful verification, sign tokens and set cookies so the user is authenticated immediately
  const tokens = createAuthTokens(user);
  setAuthCookies(res, tokens);

  return { message: 'OTP verified successfully', user: sanitizeUser(user) };
};

const login = async ({ email, phoneNumber, password }, req, res) => {
  if ((!email && !phoneNumber) || !password) {
    throw new AppError('Credentials missing', StatusCodes.BAD_REQUEST);
  }

  const user = await User.findOne({
    ...(email ? { email: email.toLowerCase() } : {}),
    ...(phoneNumber ? { phoneNumber } : {}),
  });

  if (!user) {
    throw new AppError('Invalid credentials', StatusCodes.UNAUTHORIZED);
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError('Invalid credentials', StatusCodes.UNAUTHORIZED);
  }

  if (!user.isVerified) {
    throw new AppError('Account not verified. Please complete OTP verification.', StatusCodes.FORBIDDEN);
  }

  const tokens = createAuthTokens(user);

  const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
  const sessionRecord = {
    token: refreshHash,
    userAgent: req.headers['user-agent'],
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  const activeSessions = (user.sessions || []).filter((s) => s.expiresAt > new Date());
  const trimmed = activeSessions.slice(-4);
  user.sessions = [...trimmed, sessionRecord];
  await user.save();

  setAuthCookies(res, tokens);

  return {
    message: 'Login successful',
    user: sanitizeUser(user),
  };
};

const logout = async (userPayload, req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    try {
      const decoded = verifyToken(refreshToken);
      const user = await User.findById(decoded.sub);
      if (user) {
        user.sessions = (user.sessions || []).filter(
          (session) => !bcrypt.compareSync(refreshToken, session.token)
        );
        await user.save();
      }
    } catch (error) {
      // token invalid, ignore silently
    }
  }

  const baseOptions = buildCookieOptions();
  res.clearCookie('accessToken', baseOptions);
  res.clearCookie('refreshToken', baseOptions);
  return { message: 'Logged out successfully' };
};

const refresh = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    throw new AppError('Refresh token missing', StatusCodes.UNAUTHORIZED);
  }

  let decoded;
  try {
    decoded = verifyToken(refreshToken);
  } catch (error) {
    throw new AppError('Invalid refresh token', StatusCodes.UNAUTHORIZED);
  }

  if (decoded.type !== 'refresh') {
    throw new AppError('Invalid token type', StatusCodes.UNAUTHORIZED);
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw new AppError('User not found', StatusCodes.UNAUTHORIZED);
  }

  const session = (user.sessions || []).find((s) => bcrypt.compareSync(refreshToken, s.token));
  if (!session || session.expiresAt < new Date()) {
    throw new AppError('Session expired. Please login again.', StatusCodes.UNAUTHORIZED);
  }

  const tokens = createAuthTokens(user);
  const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
  session.token = refreshHash;
  session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.save();

  setAuthCookies(res, tokens);

  return {
    message: 'Session refreshed',
    user: sanitizeUser(user),
  };
};

const session = async (userPayload) => {
  const user = await User.findById(userPayload._id).lean();
  if (!user) {
    throw new AppError('Session invalid', StatusCodes.UNAUTHORIZED);
  }

  return { user: sanitizeUser(user) };
};

module.exports = {
  register,
  login,
  sendOtp,
  verifyOtp,
  logout,
  refresh,
  session,
};
