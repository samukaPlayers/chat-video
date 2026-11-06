# Chat de Vídeo Aleatório (tipo Omegle) 🎲

Chat de vídeo com desconhecidos, sem login, com WebRTC + Socket.io.

## Como rodar (primeira vez)

1. Abra a pasta do projeto no Explorador de Arquivos
2. Clique com o botão direito em uma área vazia da pasta -> "Abrir no Terminal"
   (ou "Abrir janela do PowerShell aqui")
3. Digite e aperte Enter:
   npm install
4. Depois digite:
   npm start
5. Abra o navegador em: http://localhost:3000

## Como testar

Abra http://localhost:3000 em DUAS abas do navegador (ou um PC + celular
na mesma rede). Clique em "Iniciar" nas duas -> elas se conectam sozinhas!

## Como funciona (resumo)

- server.js        : emparelha quem clica em "Iniciar" e repassa os dados do WebRTC
- public/client.js : logica do video no navegador (WebRTC)
- public/index.html: a pagina
- public/style.css : o visual

## Avisos

- So funciona com 2 pessoas conectadas ao mesmo tempo.
- Em redes diferentes (internet), algumas conexoes caem por falta de
  servidor TURN. Veremos isso na fase de publicacao.
