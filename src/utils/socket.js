let ioInstance = null;

const setSocketServer = (io) => {
  ioInstance = io;
};

const getSocketServer = () => ioInstance;

const emitToUser = (userId, event, payload) => {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
};

const emitToRole = (role, event, payload) => {
  if (!ioInstance) return;
  ioInstance.to(`role:${role}`).emit(event, payload);
};

module.exports = {
  setSocketServer,
  getSocketServer,
  emitToUser,
  emitToRole,
};
