// src/utils/AudioManager.js
class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.unlocked = false;
    this.cache = new Map(); // opcional: cache de AudioBuffers
  }

  async init() {
    // Evita criar múltiplos contextos
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
        // Se já existe e não está fechado, tenta resumir se suspenso
        if (this.audioCtx.state === "suspended") {
            try {
                await this.audioCtx.resume();
                this.unlocked = true;
                localStorage.setItem("audioUnlocked", "true");
                console.log("[AudioManager] audio resumed automatically");
            } catch (e) {
                console.warn("[AudioManager] resume() bloqueado pelo navegador", e);
                this.unlocked = false;
            }
        } else {
             this.unlocked = true; // Já estava 'running' ou 'closed' (e será recriado)
        }
        return; // Retorna se já inicializado
    }
    
    // Cria um novo contexto se não existe ou foi fechado
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      // Verifica o estado inicial após a criação
      if (this.audioCtx.state === "running") {
          this.unlocked = true;
          localStorage.setItem("audioUnlocked", "true");
          console.log("[AudioManager] Context created in running state.");
      } else {
          // Permanece suspenso, aguardando interação do usuário ou init/resume automático
           console.log("[AudioManager] Context created in suspended state.");
           // Verifica se a permissão já foi dada antes
           if (localStorage.getItem("audioUnlocked") === "true") {
               // Tenta resumir imediatamente se a permissão já existe
               try {
                   await this.audioCtx.resume();
                   this.unlocked = true;
                   console.log("[AudioManager] audio resumed automatically based on localStorage");
               } catch(e) {
                   console.warn("[AudioManager] resume() bloqueado mesmo com localStorage flag", e);
                   this.unlocked = false;
               }
           } else {
                this.unlocked = false;
           }
      }
    } catch (e) {
      console.error("[AudioManager] AudioContext não é suportado.", e);
      return;
    }
  }


  async userUnlock() {
    // Chamado quando o usuário clica no botão "Ativar som"
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
       await this.init(); // Garante que o contexto existe e não está fechado
       if (!this.audioCtx) return; // Falha na inicialização
    }
    
    // Tenta resumir apenas se estiver suspenso
    if (this.audioCtx.state === "suspended") {
        try {
          await this.audioCtx.resume();
          this.unlocked = true;
          localStorage.setItem("audioUnlocked", "true");
          console.log("[AudioManager] unlocked by user");
        } catch (e) {
          console.error("[AudioManager] failed to unlock:", e);
           this.unlocked = false; // Garante que fique falso se falhar
           localStorage.removeItem("audioUnlocked"); // Remove a permissão se falhar
        }
    } else {
         // Se já está 'running', apenas confirma e salva no localStorage
         this.unlocked = true; 
         localStorage.setItem("audioUnlocked", "true");
         console.log("[AudioManager] context already running, confirmed unlock by user");
    }
  }

  async _fetchAndDecode(url) {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
        console.error("[AudioManager] AudioContext não inicializado ou fechado para decodificar.");
        await this.init(); // Tenta (re)inicializar
        if (!this.audioCtx || this.audioCtx.state === 'closed') return null; // Retorna null se falhar
    }
    // cache simples para evitar downloads repetidos
    if (this.cache.has(url)) return this.cache.get(url);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        // Verifica se o contexto ainda é válido antes de decodificar
        if (this.audioCtx.state === 'closed') {
             console.warn("[AudioManager] Context closed before decoding could complete.");
             return null;
        }
        const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
        this.cache.set(url, audioBuffer);
        return audioBuffer;
    } catch (e) {
        console.error("[AudioManager] Falha ao buscar ou decodificar áudio:", url, e);
        return null; // Retorna null em caso de erro
    }
  }

  async playSound(url, { loop = false, volume = 1 } = {}) {
     // Garante que o contexto está inicializado e tenta retomar se necessário
    await this.init(); 

    if (!this.audioCtx || this.audioCtx.state !== 'running') {
       console.warn("[AudioManager] play blocked: AudioContext not running. State:", this.audioCtx?.state);
       // Informa ao usuário que precisa interagir
       this.unlocked = false; // Marca como não desbloqueado
       // Poderia disparar um evento ou atualizar um estado global para mostrar a UI de desbloqueio
       return () => {}; // Retorna uma função de parada vazia
    }
    
    // Se chegou aqui, o contexto está 'running'
    this.unlocked = true; 

    try {
      const buffer = await this._fetchAndDecode(url);
      if (!buffer) return () => {}; // Falha no fetch/decode

      // Cria os nós de áudio dentro do contexto válido
      const src = this.audioCtx.createBufferSource();
      src.buffer = buffer;

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime); // Define o volume inicial

      src.connect(gain);
      gain.connect(this.audioCtx.destination);

      src.loop = loop;
      src.start(0); // Inicia a reprodução

      console.log('[AudioManager] Sound started:', url);

      // retorna função para parar o som
      return () => {
        try { 
          if (src) {
              src.stop(); 
              src.disconnect();
          }
          if (gain) {
              gain.disconnect();
          }
          console.log('[AudioManager] Sound stopped:', url);
        } catch(e){ 
            // Ignora erros como "InvalidStateNode" se o som já parou ou foi desconectado
            // console.warn("[AudioManager] Error stopping sound (might be already stopped):", e);
        }
      };
    } catch (e) {
      console.error("[AudioManager] Error playing sound:", e);
      return () => {}; // Retorna função vazia em caso de erro
    }
  }
}
export const audioManager = new AudioManager();
export default audioManager;

