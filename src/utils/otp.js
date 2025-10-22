const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const generateNumericOtp = (digits = 6) => {
  const max = 10 ** digits;
  const number = crypto.randomInt(0, max);
  return number.toString().padStart(digits, '0');
};

const hashOtp = async (otp) => bcrypt.hash(otp, 10);

const compareOtp = async (otp, hash) => bcrypt.compare(String(otp), hash);

module.exports = {
  generateNumericOtp,
  hashOtp,
  compareOtp,
};
