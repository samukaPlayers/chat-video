const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve os arquivos da pasta public (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Páginas jurídicas; a sinalização e o matchmaking permanecem inalterados.
app.get('/termos', (req, res) => res.sendFile(path.join(__dirname, 'public', 'termos.html')));
app.get('/privacidade', (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacidade.html')));

let waiting = null;              // socket.id de quem esta aguardando um parceiro
const partners = new Map();      // socketId -> socketId do parceiro

io.on('connection', (socket) => {
  console.log('Novo usuario conectado:', socket.id);

  // Entra na fila de emparelhamento
  socket.on('join', () => {
    leavePartner(socket);

    if (waiting && waiting !== socket.id && io.sockets.sockets.has(waiting)) {
      // Emparelha os dois!
      const other = waiting;
      waiting = null;
      partners.set(socket.id, other);
      partners.set(other, socket.id);
      io.to(socket.id).emit('matched', { initiator: true });
      io.to(other).emit('matched', { initiator: false });
    } else {
      waiting = socket.id;
      socket.emit('waiting');
    }
  });

  // Repassa os dados tecnicos do WebRTC entre os dois navegadores (signaling)
  socket.on('signal', (data) => {
    const partner = partners.get(socket.id);
    if (partner) io.to(partner).emit('signal', data);
  });

  // Chat de texto
  socket.on('chat', (msg) => {
    const partner = partners.get(socket.id);
    if (partner) io.to(partner).emit('chat', msg);
  });

  // Botao "Proximo"
  socket.on('next', () => {
    leavePartner(socket);
  });

  socket.on('disconnect', () => {
    leavePartner(socket);
    if (waiting === socket.id) waiting = null;
  });
});

function leavePartner(socket) {
  const partner = partners.get(socket.id);
  if (partner) {
    partners.delete(partner);
    partners.delete(socket.id);
    io.to(partner).emit('partner-left');
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Servidor rodando! Abra http://localhost:' + PORT + ' no navegador.');
});
