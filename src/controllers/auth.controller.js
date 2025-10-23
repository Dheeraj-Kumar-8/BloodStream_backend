const authService = require('../services/auth.service');

const register = async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body, req, res);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const sendOtp = async (req, res, next) => {
  try {
    const data = await authService.sendOtp(req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const data = await authService.verifyOtp(req.body, req, res);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user, req, res);
    res.json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const data = await authService.refresh(req, res);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const session = async (req, res, next) => {
  try {
    const data = await authService.session(req.user);
    res.json(data);
  } catch (error) {
    next(error);
  }
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
