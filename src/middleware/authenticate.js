const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const User = require('../models/user.model');
const { AppError } = require('../utils/errors');

const authenticate = async (req, res, next) => {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).lean();

    if (!user) {
      throw new AppError('Invalid token', StatusCodes.UNAUTHORIZED);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError('Invalid or expired token', StatusCodes.UNAUTHORIZED));
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
};
