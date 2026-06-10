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
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Voice Chat POC');

  // --- Signals for Reactive State ---
  recognizedText = signal('');
  isRecording = signal(false);
  chatHistory = signal<ChatMessage[]>([]);

  private recognition: any;

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
        });
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        this.zone.run(() => {
          this.isRecording.set(false);
        });
      };

      this.recognition.onend = () => {
        this.zone.run(() => {
          this.isRecording.set(false);
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
    } else {
      this.recognizedText.set('');
      this.recognition.start();
    }
  }

  // --- 2. CHAT LOGIC & TEXT TO SPEECH ---
  sendMessage() {
    const userText = this.recognizedText().trim();
    if (!userText) return;

    // 1. Stop recording if it's currently on
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
    // A simple mock logic to make the chat feel slightly interactive
    const inputLower = userInput.toLowerCase();
    if (inputLower.includes('hello') || inputLower.includes('hi')) {
      return "Hello there! How can I help you today?";
    } else if (inputLower.includes('how are you')) {
      return "I'm just a browser API, but I'm doing great! How about you?";
    } else {
      return `I heard you say: "${userInput}". That is very interesting!`;
    }
  }

  speakText(text: string) {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech before starting a new one
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
