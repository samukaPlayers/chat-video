const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const statusEl = document.getElementById('status');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatBox = document.getElementById('chatBox');

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

let socket = null;
let pc = null;
let localStream = null;
let pendingIce = [];

function setStatus(text) { statusEl.textContent = text; }

startBtn.onclick = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  } catch (err) {
    alert('Não foi possível acessar câmera/microfone. Verifique a permissão no navegador (ícone de cadeado na barra de endereço).');
    return;
  }
  startBtn.disabled = true;
  nextBtn.disabled = false;
  connect();
};

function connect() {
  socket = io();

  socket.on('connect', () => {
    setStatus('Conectado. Procurando alguém...');
    socket.emit('join');
  });

  socket.on('waiting', () => setStatus('Aguardando outra pessoa...'));

  socket.on('matched', ({ initiator }) => {
    setStatus('Achamos alguém! Conectando...');
    createPeer(initiator);
  });

  socket.on('signal', handleSignal);

  socket.on('partner-left', () => {
    setStatus('O outro usuário saiu. Procurando novo...');
    cleanupPeer();
    socket.emit('join');
  });

  socket.on('chat', (msg) => addMsg(msg, 'them'));
}

function createPeer(isInitiator) {
  cleanupPeer();
  pendingIce = [];
  pc = new RTCPeerConnection(RTC_CONFIG);

  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

  pc.ontrack = (e) => { remoteVideo.srcObject = e.streams[0]; };

  pc.onicecandidate = (e) => {
    if (e.candidate) socket.emit('signal', { ice: e.candidate });
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') setStatus('Conectado! Divirta-se 😄');
    if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
      setStatus('Conexão de vídeo caiu.');
    }
  };

  // Quem foi emparelhado por ultimo cria a oferta de conexão
  if (isInitiator) {
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => socket.emit('signal', { sdp: pc.localDescription }))
      .catch((err) => console.error(err));
  }
}

async function handleSignal(data) {
  if (!pc) return;
  try {
    if (data.sdp) {
      await pc.setRemoteDescription(data.sdp);
      // Adiciona os candidatos ICE que chegaram antes da descrição remota
      while (pendingIce.length) await pc.addIceCandidate(pendingIce.shift());
      if (data.sdp.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal', { sdp: pc.localDescription });
      }
    } else if (data.ice) {
      if (pc.remoteDescription) await pc.addIceCandidate(data.ice);
      else pendingIce.push(data.ice);
    }
  } catch (err) {
    console.error('Erro no signal:', err);
  }
}

function cleanupPeer() {
  if (pc) { pc.close(); pc = null; }
  remoteVideo.srcObject = null;
}

nextBtn.onclick = () => {
  cleanupPeer();
  setStatus('Procurando outra pessoa...');
  socket.emit('next');
  socket.emit('join');
};

chatForm.onsubmit = (e) => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg || !socket) return;
  socket.emit('chat', msg);
  addMsg(msg, 'me');
  chatInput.value = '';
};

function addMsg(text, who) {
  const div = document.createElement('div');
  div.className = 'msg ' + who;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
