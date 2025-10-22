const { StatusCodes } = require('http-status-codes');

const notFoundHandler = (req, res, _next) => {
  res.status(StatusCodes.NOT_FOUND).json({
    message: 'Resource not found',
  });
};

const errorHandler = (err, req, res, _next) => {
  console.error(err);
  const status = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    details: err.details || undefined,
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
