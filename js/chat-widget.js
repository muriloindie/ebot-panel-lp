document.addEventListener('DOMContentLoaded', () => {
  const markedScript = document.createElement('script');
  markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
  document.head.appendChild(markedScript);

  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const chatMessages = document.getElementById('chat-messages');
  const chatCountEl = document.getElementById('chat-count');
  const chatContainer = document.querySelector('.chat-container');
  
  if (!chatInput || !chatSend || !chatMessages || !chatContainer) return;
  
  let interactions = 10;
  let chatHistory = "";
  
  const baseSystemPrompt = chatContainer.getAttribute('data-system-prompt') || "Você é um assistente útil e amigável. Responda sempre no idioma Português Brasileiro, nunca em outro idioma!";
  const botName = chatContainer.getAttribute('data-bot-name') || "Assistente";

  const buttonHtml = `<button class="trigger-wa-modal btn btn-primary" style="display:inline-flex;align-items:center;justify-content:center;gap:0.5rem;margin-top:0.75rem;"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.28 14.3c-.22.61-1.28 1.15-1.78 1.22-.43.06-1.02.13-3.23-.79-2.66-1.11-4.38-3.83-4.52-4.01-.13-.19-1.08-1.44-1.08-2.75 0-1.31.68-1.95.92-2.22.24-.26.52-.33.69-.33.17 0 .34 0 .49.01.16.01.37-.06.57.43.21.5.73 1.77.79 1.9.06.13.1.28.01.47-.08.19-.13.31-.26.46-.13.15-.28.33-.39.46-.13.14-.27.29-.12.56.15.26.68 1.13 1.46 1.83.99.9 1.84 1.18 2.1 1.31.26.13.41.11.56-.06.15-.17.65-.75.82-1.01.17-.26.34-.22.58-.13.24.09 1.53.72 1.79.85.26.13.43.19.5.3.06.11.06.64-.16 1.25z"/></svg> Agendar Demonstração</button>`;

  // Placeholder que a IA deve escrever — o JS substitui por buttonHtml antes de renderizar
  const BUTTON_PLACEHOLDER = '[BOTAO_AGENDAR]';

  // ATENÇÃO: O texto do botão deve ser written EXATAMENTE como placeholder abaixo, sem espaços extras ou variações
  // A IA deve terminar a resposta com esta linha EXATA (incluindo os colchetes):
  // [BOTAO_AGENDAR]
  const systemPrompt = `${baseSystemPrompt}

IMPORTANT: Você deve sempre recomendar a solução desta página de forma clara e encorajadora.

Ao final de TODAS as suas respostas, adicione esta linha exata (sem as aspas):
"[BOTAO_AGENDAR]"

Não escreva código HTML. Não escreva o botão. Apenas escreva o texto [BOTAO_AGENDAR] no final.
A função de renderização Replacehed substitui automaticamente o texto [BOTAO_AGENDAR] pelo botão real.`;

  const GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'mixtral-8x7b-32768', 
    'deepseek-r1-distill-qwen-32b',
    'llama-3.1-8b-instant',
    'gemma-7b-it'
  ];

  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const apiKey = (window.ENV_CONFIG && window.ENV_CONFIG.GROQ_API_KEY) || window.GROQ_API_KEY || '';

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function renderMarkdown(text) {
    // O placeholder [BOTAO_AGENDAR] é substituído após parsear o Markdown
    // para evitar que o marked.js escape o HTML do botão
    const PLACEHOLDER = '[BOTAO_AGENDAR]';
    const SAFE_TOKEN = 'EBOT__SCHEDULE__BTN';

    // Troca o placeholder por um token seguro (sem colchetes) antes do Markdown
    // Usamos regex case-insensitive para capturar variações
    let processed = text.replace(/\[BOTAO_AGENDAR\]/gi, SAFE_TOKEN);

    let html;
    if (window.marked) {
      html = marked.parse(processed);
    } else {
      html = escapeHtml(processed);
    }

    // Agora substitui o token (e qualquer versão escaped) pelo botão real
    html = html.replace(/EBOT__SCHEDULE__BTN/gi, buttonHtml);
    // Limpar parágrafo vazio que marked pode criar ao redor do token
    html = html.replace(/<p>\s*EBOT__SCHEDULE__BTN\s*<\/p>/gi, buttonHtml);
    // Também remover qualquer <p> que contenha só o token
    html = html.replace(/<p>.*?EBOT__SCHEDULE__BTN.*?<\/p>/gi, buttonHtml);
    return html;
  }

  function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;")
         .replace(/\n/g, "<br>");
  }

  function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.style.display = 'flex';
    msgDiv.style.gap = '0.75rem';
    msgDiv.style.maxWidth = '80%';
    msgDiv.style.marginBottom = '1rem';
    msgDiv.style.animation = 'fadeIn 0.3s ease forwards';
    
    if (role === 'user') {
      msgDiv.style.marginLeft = 'auto';
      msgDiv.style.flexDirection = 'row-reverse';
      msgDiv.innerHTML = `
        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--dark-header, #2f3835); flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8rem; font-weight: bold;">VC</div>
        <div style="background: var(--primary, #88a72f); color: white; padding: 1rem 1.25rem; border-radius: 16px 0 16px 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); font-size: 0.95rem; line-height: 1.5; word-wrap: break-word;">
          ${escapeHtml(text)}
        </div>
      `;
    } else {
      const botImgSrc = chatContainer.querySelector('img') ? chatContainer.querySelector('img').src : '';
      msgDiv.innerHTML = `
        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary, #88a72f); flex-shrink: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
          <img src="${botImgSrc}" alt="Icon" style="width: 18px; height: 18px; object-fit: contain;">
        </div>
        <div class="bot-msg-content" style="background: white; padding: 1rem 1.25rem; border-radius: 0 16px 16px 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); font-size: 0.95rem; color: var(--dark, #333); line-height: 1.5; word-wrap: break-word;">
          ${text === 'Pensando...' ? '<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>' : renderMarkdown(text)}
        </div>
      `;
    }
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
    return msgDiv;
  }

  async function tryModel(modelIndex, messages, apiKeyToUse) {
    if (modelIndex >= GROQ_MODELS.length) {
      throw new Error('ALL_MODELS_FAILED');
    }

    const currentModel = GROQ_MODELS[modelIndex];
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyToUse}`
      },
      body: JSON.stringify({
        model: currentModel,
        messages: messages,
        temperature: 1,
        max_completion_tokens: 8192,
        top_p: 1,
        stream: true
      })
    });

    if (!response.ok) {
      console.warn(`Model ${currentModel} failed with status ${response.status}`);
      return tryModel(modelIndex + 1, messages, apiKeyToUse);
    }

    return { response, model: currentModel };
  }

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || interactions <= 0) return;
    
    chatInput.value = '';
    chatInput.disabled = true;
    chatSend.disabled = true;
    
    interactions--;
    chatCountEl.textContent = interactions;
    
    appendMessage('user', text);
    chatHistory += `\nUsuário: ${text}\nAssistente:`;
    
    const botMsgDiv = appendMessage('bot', 'Pensando...');
    const botContentEl = botMsgDiv.querySelector('.bot-msg-content');
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Aqui está o histórico da nossa conversa e minha nova mensagem.\n\n${chatHistory}`
      }
    ];

    try {
      const { response, model } = await tryModel(0, messages, apiKey);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let botFullText = "";
      let renderedText = "";
      let streamFinished = false;
      
      const typeInterval = setInterval(() => {
        // Texto limpo sem tags <think>
        const cleanText = botFullText.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trimStart();

        // Texto de exibição durante stream: sem o placeholder (evita texto parcial quebrado)
        const textForTyping = cleanText
          .replace(/\[BOTAO_AGENDAR\]/gi, '')
          .replace(/\[BOTAO_AGEND[A-R_]*\]?/gi, '')
          .trimEnd();

        if (renderedText.length < textForTyping.length) {
          // Typewriter: vai digitando o texto progressivamente
          const diff = textForTyping.length - renderedText.length;
          let charsToAdd = 1;
          if (diff > 15)  charsToAdd = 2;
          if (diff > 40)  charsToAdd = 3;
          if (diff > 80)  charsToAdd = 5;
          if (diff > 150) charsToAdd = 8;

          renderedText = textForTyping.slice(0, renderedText.length + charsToAdd);
          botContentEl.innerHTML = renderMarkdown(renderedText) + '<span class="typing-cursor"></span>';
          scrollToBottom();
        } else if (streamFinished) {
          // Stream terminou e o typewriter chegou ao fim: renderiza o texto COMPLETO com o botão
          clearInterval(typeInterval);
          const finalText = cleanText.trimEnd() || 'Desculpe, não consegui formular uma resposta no momento.';
          botContentEl.innerHTML = renderMarkdown(finalText);
          scrollToBottom();
        }
      }, 35);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          streamFinished = true;
          break;
        }
        
        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');
        
        for (const line of lines) {
          if (line.trim() && line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') continue;
              
              const data = JSON.parse(jsonStr);
              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                botFullText += data.choices[0].delta.content;
              }
            } catch (e) { }
          }
        }
      }
      
      streamFinished = true;
      let finalBotText = botFullText.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
      chatHistory += ` ${finalBotText}\n`;
      
    } catch (error) {
      console.error('Chat Error:', error);
      if (error.message === 'ALL_MODELS_FAILED') {
        botContentEl.innerHTML = '<span style="color:#666; font-size: 0.9rem;">Ocorreu um problema. Por favor, atualize a página ou tente novamente.</span>';
      } else {
        botContentEl.innerHTML = '<span style="color:#666; font-size: 0.9rem;">Ocorreu um problema. Por favor, atualize a página ou tente novamente.</span>';
      }
    } finally {
      if (interactions > 0) {
        chatInput.disabled = false;
        chatSend.disabled = false;
        chatInput.focus();
      } else {
        chatInput.placeholder = 'Limite de interações atingido.';
      }
      scrollToBottom();
    }
  }

  chatSend.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  
  const style = document.createElement('style');
  style.innerHTML = `
    .chat-section {
      position: relative;
    }
    .chat-bg-grid {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-size: 40px 40px;
      background-image: 
        linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px);
      z-index: 0;
      pointer-events: none;
    }
    .chat-flashlight {
      position: absolute;
      top: -50%; left: -50%; width: 200%; height: 200%;
      background: radial-gradient(circle at center, rgba(136, 167, 47, 0.12) 0%, transparent 40%),
                  radial-gradient(circle at 80% 80%, rgba(43, 159, 232, 0.08) 0%, transparent 35%);
      animation: flashlightWave 12s ease-in-out infinite alternate;
      z-index: 1;
      opacity: 0.8;
      pointer-events: none;
      mix-blend-mode: multiply;
    }
    
    .chat-panel .chat-flashlight {
      background: radial-gradient(circle at center, rgba(138, 43, 226, 0.12) 0%, transparent 40%),
                  radial-gradient(circle at 80% 80%, rgba(136, 167, 47, 0.08) 0%, transparent 35%);
    }
    .chat-clinical .chat-flashlight {
      background: radial-gradient(circle at center, rgba(43, 159, 232, 0.12) 0%, transparent 40%),
                  radial-gradient(circle at 80% 80%, rgba(136, 167, 47, 0.08) 0%, transparent 35%);
    }
    .chat-explorer .chat-flashlight {
      background: radial-gradient(circle at center, rgba(255, 187, 0, 0.1) 0%, transparent 40%),
                  radial-gradient(circle at 80% 80%, rgba(136, 167, 47, 0.08) 0%, transparent 35%);
    }

    @keyframes flashlightWave {
      0% { transform: translate(0%, 0%) scale(1); }
      50% { transform: translate(15%, 20%) scale(1.2); }
      100% { transform: translate(-10%, -5%) scale(0.9); }
    }
    .chat-container {
      position: relative;
      z-index: 2;
    }
    .typing-dots span {
      animation: blink 1.4s infinite both;
      font-size: 1.5rem;
      line-height: 0.5;
    }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); }
     to { opacity: 1; transform: translateY(0); } }
    #chat-input:disabled { opacity: 0.7; cursor: not-allowed; }
    #chat-send:disabled { opacity: 0.7; cursor: not-allowed; }
    .bot-msg-content { line-height: 1.6; }
    .bot-msg-content p { margin-bottom: 0.75rem; }
    .bot-msg-content p:last-child { margin-bottom: 0; }
    .bot-msg-content ul, .bot-msg-content ol { margin-left: 1.5rem; margin-bottom: 0.75rem; }
    .bot-msg-content li { margin-bottom: 0.25rem; }
    .bot-msg-content strong { font-weight: 700; color: #111; }
    .bot-msg-content h1, .bot-msg-content h2, .bot-msg-content h3 { font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem; color: #111; font-size: 1.1rem; }
    .bot-msg-content table { width: 100%; border-collapse: collapse; margin-bottom: 0.75rem; }
    .bot-msg-content th, .bot-msg-content td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    .bot-msg-content th { background-color: rgba(0,0,0,0.05); }
    .bot-msg-content code { background: rgba(0,0,0,0.05); padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; font-size: 0.85em; }
    .bot-msg-content pre { background: #1e1e1e; color: #fff; padding: 1rem; border-radius: 8px; overflow-x: auto; margin-bottom: 0.75rem; }
    .bot-msg-content pre code { background: transparent; color: inherit; padding: 0; }
    .bot-msg-content a { color: var(--primary); text-decoration: underline; }
    .bot-msg-content button { font-family: 'Inter', sans-serif; cursor: pointer; }
    
    .typing-cursor {
      display: inline-block;
      width: 6px;
      height: 1.1em;
      background-color: var(--primary, #88a72f);
      vertical-align: text-bottom;
      margin-left: 4px;
      animation: cursorBlink 1.2s ease-in-out infinite;
      border-radius: 2px;
    }
    @keyframes cursorBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;
  document.head.appendChild(style);
});
