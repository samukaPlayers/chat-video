const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const endBtn = document.getElementById('endBtn');
const consentDialog = document.getElementById('consentDialog');
const consentForm = document.getElementById('consentForm');
const acceptTerms = document.getElementById('acceptTerms');
const continueBtn = document.getElementById('continueBtn');
const cancelConsentBtn = document.getElementById('cancelConsentBtn');
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

let sessionVersion = 0;

startBtn.onclick = () => {
  acceptTerms.checked = false;
  continueBtn.disabled = true;
  consentDialog.showModal();
};
acceptTerms.onchange = () => { continueBtn.disabled = !acceptTerms.checked; };
cancelConsentBtn.onclick = () => consentDialog.close();
consentDialog.addEventListener('close', () => startBtn.focus());
consentForm.onsubmit = (event) => {
  event.preventDefault();
  if (!acceptTerms.checked || startBtn.disabled) return;
  consentDialog.close();
  startSession();
};

async function startSession() {
  const version = ++sessionVersion;
  startBtn.disabled = true;
  endBtn.disabled = false;
  // Tenta ligar a camera/microfone. Se nao tiver, entra no modo texto.
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    // Uma permissão pode ser concedida depois que a sessão foi encerrada.
    if (version !== sessionVersion) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    localStream = stream;
    localVideo.srcObject = localStream;
  } catch (err) {
    if (version !== sessionVersion) return;
    const entrar = confirm(
      'Não foi possível acessar câmera/microfone (talvez você não tenha).\n\n' +
      'Você pode entrar no MODO TEXTO (só chat, sem vídeo). Continuar?'
    );
    if (!entrar) { endSession(); return; }
    localStream = null;
    setStatus('Modo texto ativado (sem câmera)');
  }
  startBtn.disabled = true;
  nextBtn.disabled = false;
  connect();
}

function endSession() {
  ++sessionVersion;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  cleanupPeer();
  pendingIce = [];
  if (localStream) localStream.getTracks().forEach((track) => track.stop());
  localStream = null;
  localVideo.srcObject = null;
  nextBtn.disabled = true;
  endBtn.disabled = true;
  startBtn.disabled = false;
  setStatus('Sessão encerrada. Câmera e microfone desligados.');
}
endBtn.onclick = endSession;
window.addEventListener('pagehide', endSession);

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

  // Só envia vídeo/áudio se a camera foi ligada
  if (localStream) {
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  }

  pc.ontrack = (e) => { remoteVideo.srcObject = e.streams[0]; };

  pc.onicecandidate = (e) => {
    if (e.candidate) socket.emit('signal', { ice: e.candidate });
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') setStatus('Conectado! Divirta-se 😄');
    if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
      setStatus('Conexão caiu.');
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
  if (pc) { pc.onconnectionstatechange = null; pc.close(); pc = null; }
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
