"use client";

/** 5D Sound Engine for Emoji Reactions & Live Commentator Voice */
class SoundEngine {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.preloadSounds();
    }
  }

  private preloadSounds() {
    // Preload audio files when client initializes
    const soundFiles: Record<string, string> = {
      laugh: "https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3",
      cry: "https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3",
      applause: "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3",
      fire: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
      six_roll: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
      knockout: "https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3",
      home: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
    };

    Object.entries(soundFiles).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = "auto";
      this.audioCache.set(key, audio);
    });
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public playSFX(key: string) {
    if (this.isMuted || typeof window === "undefined") return;

    const audio = this.audioCache.get(key);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Handle browser autoplay policy restrictions gracefully
      });
    }
  }

  /** Triggers Web Speech API synthesis for real-time live commentary */
  public speakCommentary(text: string) {
    if (this.isMuted || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel(); // Stop any pending speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; // Energetic commentary pace
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    // Prefer English voices if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find((v) => v.lang.startsWith("en"));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  /** Plays audio reaction based on tapped emoji */
  public playEmojiAudio(emoji: string) {
    switch (emoji) {
      case "😂":
        this.playSFX("laugh");
        this.speakCommentary("Hilarious!");
        break;
      case "😭":
        this.playSFX("cry");
        this.speakCommentary("Oh, what a pity!");
        break;
      case "👏":
        this.playSFX("applause");
        this.speakCommentary("Sensational move!");
        break;
      case "🔥":
      case "😡":
        this.playSFX("fire");
        this.speakCommentary("Pure fire!");
        break;
      default:
        this.playSFX("applause");
        break;
    }
  }

  /** Commentator triggers for game milestones */
  public announceDiceRoll(val: number) {
    if (val === 6) {
      this.playSFX("six_roll");
      this.speakCommentary("Boom! A massive Six! Roll again!");
    }
  }

  public announceCapture() {
    this.playSFX("knockout");
    this.speakCommentary("Brutal Knockout! Back to base!");
  }

  public announceHome() {
    this.playSFX("home");
    this.speakCommentary("Touchdown into the center!");
  }
}

export const soundEngine = new SoundEngine();