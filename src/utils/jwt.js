const jwt = require('jsonwebtoken');
const { AppError } = require('./errors');

const signToken = (payload, expiresIn) => {
  if (!process.env.JWT_SECRET) {
    throw new AppError('JWT secret missing in environment');
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

const verifyToken = (token) => {
  if (!process.env.JWT_SECRET) {
    throw new AppError('JWT secret missing in environment');
  }
  return jwt.verify(token, process.env.JWT_SECRET);
};

const createAuthTokens = (user) => {
  const accessToken = signToken({ sub: user._id, role: user.role }, '30m');
  const refreshToken = signToken({ sub: user._id, type: 'refresh' }, '7d');
  return { accessToken, refreshToken };
};

module.exports = {
  signToken,
  verifyToken,
  createAuthTokens,
};
