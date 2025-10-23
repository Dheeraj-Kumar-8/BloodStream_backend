const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const generateNumericOtp = (digits = 6) => {
  if (process.env.OTP_STATIC_CODE) {
    // Always return configured static code (trim/pad to requested digits)
    return process.env.OTP_STATIC_CODE.toString().padStart(digits, '0').slice(-digits);
  }

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
