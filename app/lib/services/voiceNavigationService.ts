// Voice Navigation Service
// Text-to-speech for turn-by-turn directions

import type { NavigationStep } from '@/lib/types';

class VoiceNavigationService {
  private synthesis: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private enabled: boolean = true;
  private lastAnnouncedStepId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
    }
  }

  private loadVoices() {
    if (!this.synthesis) return;

    const setVoice = () => {
      const voices = this.synthesis!.getVoices();
      // Prefer English voices
      this.voice =
        voices.find((v) => v.lang.startsWith('en-') && v.name.includes('Google')) ||
        voices.find((v) => v.lang.startsWith('en-')) ||
        voices[0] ||
        null;
    };

    if (this.synthesis.getVoices().length > 0) {
      setVoice();
    } else {
      this.synthesis.addEventListener('voiceschanged', setVoice);
    }
  }

  /**
   * Enable or disable voice navigation
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Check if voice navigation is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Speak a navigation instruction
   */
  speak(text: string, priority: 'high' | 'normal' = 'normal') {
    if (!this.enabled || !this.synthesis) return;

    // Cancel lower priority announcements
    if (priority === 'high') {
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    if (this.voice) {
      utterance.voice = this.voice;
    }

    this.synthesis.speak(utterance);
  }

  /**
   * Announce a navigation step
   */
  announceStep(step: NavigationStep, distance: number) {
    if (!this.enabled || !step) return;

    // Don't repeat the same instruction
    if (this.lastAnnouncedStepId === step.id) return;
    this.lastAnnouncedStepId = step.id;

    const distanceText = this.formatDistanceForSpeech(distance);
    const instruction = this.formatInstructionForSpeech(step.instruction);

    this.speak(`In ${distanceText}, ${instruction}`, 'high');
  }

  /**
   * Announce arrival at destination
   */
  announceArrival(destinationName?: string) {
    const message = destinationName
      ? `You have arrived at ${destinationName}`
      : 'You have arrived at your destination';
    
    this.speak(message, 'high');
  }

  /**
   * Announce recalculating route
   */
  announceRecalculating() {
    this.speak('Recalculating route', 'high');
  }

  /**
   * Announce hazard ahead
   */
  announceHazard(hazardType: string, distance: number) {
    const distanceText = this.formatDistanceForSpeech(distance);
    const hazardMap: Record<string, string> = {
      police: 'police reported',
      accident: 'accident reported',
      hazard: 'hazard on road',
      traffic: 'heavy traffic',
      road_closed: 'road closure',
    };

    const hazardText = hazardMap[hazardType] || 'hazard';
    this.speak(`${hazardText} ahead in ${distanceText}`, 'normal');
  }

  /**
   * Format distance for speech (e.g., "500 meters" or "2 kilometers")
   */
  private formatDistanceForSpeech(meters: number): string {
    if (meters < 50) {
      return 'a few meters';
    } else if (meters < 100) {
      return '100 meters';
    } else if (meters < 1000) {
      return `${Math.round(meters / 50) * 50} meters`;
    } else {
      const km = meters / 1000;
      if (km < 1.5) {
        return '1 kilometer';
      }
      return `${Math.round(km)} kilometers`;
    }
  }

  /**
   * Format instruction for more natural speech
   */
  private formatInstructionForSpeech(instruction: string): string {
    return instruction
      .toLowerCase()
      .replace(/\b(st|street)\b/gi, 'street')
      .replace(/\b(rd|road)\b/gi, 'road')
      .replace(/\b(ave|avenue)\b/gi, 'avenue')
      .replace(/\b(blvd|boulevard)\b/gi, 'boulevard')
      .replace(/\b(dr|drive)\b/gi, 'drive')
      .replace(/\b(ln|lane)\b/gi, 'lane');
  }

  /**
   * Stop all speech
   */
  stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}

// Singleton instance
let voiceNavigationService: VoiceNavigationService | null = null;

export function getVoiceNavigationService(): VoiceNavigationService {
  if (!voiceNavigationService) {
    voiceNavigationService = new VoiceNavigationService();
  }
  return voiceNavigationService;
}
