const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDatabase = require('./config/database');
const registerSockets = require('./sockets');
const apiRouter = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandlers');
const { setSocketServer } = require('./utils/socket');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

// API routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Register sockets
setSocketServer(io);
registerSockets(io);

// Start server only after DB connection
connectDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`BloodStream backend running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to database', error);
    process.exit(1);
  });

module.exports = { app, server, io };
