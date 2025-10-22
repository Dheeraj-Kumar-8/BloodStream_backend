const registerSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('Socket connected', socket.id);

    socket.on('join', (payload) => {
      if (payload?.userId) {
        socket.join(`user:${payload.userId}`);
      }
      if (payload?.role) {
        socket.join(`role:${payload.role}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected', socket.id);
    });
  });
};

module.exports = registerSockets;
