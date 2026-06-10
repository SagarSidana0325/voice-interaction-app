import { Component, signal, NgZone, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

declare var webkitSpeechRecognition: any;

interface ChatMessage {
  sender: 'User' | 'Bot';
  text: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss' // Keeping your scss reference, but we are using inline styles below for immediate effect
})
export class App implements OnInit {
  protected readonly title = signal('Nova AI'); // Updated title for a premium vibe

  // --- Signals for Reactive State ---
  recognizedText = signal('');
  isRecording = signal(false);
  chatHistory = signal<ChatMessage[]>([]);

  private recognition: any;
  private silenceTimer: any;
  private readonly SILENCE_DELAY = 1500; // 1.5 seconds

  constructor(private zone: NgZone) {}

  ngOnInit() {
    this.initSpeechRecognition();
  }

  // --- 1. SPEECH TO TEXT (MIC INPUT) ---
  initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.zone.run(() => {
          this.isRecording.set(true);
        });
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        this.zone.run(() => {
          this.recognizedText.set(finalTranscript || interimTranscript);
          this.resetSilenceTimer(); // Reset timer every time a new word is detected
        });
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        this.zone.run(() => {
          this.isRecording.set(false);
          clearTimeout(this.silenceTimer);
        });
      };

      this.recognition.onend = () => {
        this.zone.run(() => {
          this.isRecording.set(false);
          clearTimeout(this.silenceTimer);
        });
      };
    } else {
      console.warn('Speech recognition is not supported in this browser.');
    }
  }

  toggleRecording() {
    if (!this.recognition) {
      alert('Speech recognition is not supported in your browser. Please use Google Chrome.');
      return;
    }

    if (this.isRecording()) {
      this.recognition.stop();
      clearTimeout(this.silenceTimer);
    } else {
      this.recognizedText.set('');
      this.recognition.start();
    }
  }

  // --- 2. AUTO-SUBMIT LOGIC ---
  resetSilenceTimer() {
    clearTimeout(this.silenceTimer);
    // Only trigger if there is actual text
    if (this.recognizedText().trim()) {
      this.silenceTimer = setTimeout(() => {
        this.zone.run(() => {
          this.sendMessage();
        });
      }, this.SILENCE_DELAY);
    }
  }

  // --- 3. CHAT LOGIC & TEXT TO SPEECH ---
  sendMessage() {
    clearTimeout(this.silenceTimer); // Ensure timer is cleared
    
    const userText = this.recognizedText().trim();
    if (!userText) return;

    // 1. Stop recording to prepare for Bot speech
    if (this.isRecording()) {
      this.recognition.stop();
    }

    // 2. Add User Message to Chat
    this.chatHistory.update(history => [...history, { sender: 'User', text: userText }]);

    // 3. Clear the input
    this.recognizedText.set('');

    // 4. Generate a dynamic Bot Response
    const botResponseText = this.generateBotResponse(userText);

    // Simulate a slight delay for the bot "typing/thinking"
    setTimeout(() => {
      this.chatHistory.update(history => [...history, { sender: 'Bot', text: botResponseText }]);
      this.speakText(botResponseText);
    }, 500);
  }

  generateBotResponse(userInput: string): string {
    const inputLower = userInput.toLowerCase();
    if (inputLower.includes('hello') || inputLower.includes('hi')) {
      return "Hello! How can I assist you today?";
    } else if (inputLower.includes('how are you')) {
      return "I'm running smoothly. What's on your mind?";
    } else {
      return `I caught that: "${userInput}". Let's dive deeper into it!`;
    }
  }

  speakText(text: string) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Text-to-speech is not supported in your browser.');
    }
  }
}