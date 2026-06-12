import { Component, signal, NgZone, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AiService } from './services/ai.service';
import { HttpClient } from '@angular/common/http';

declare var webkitSpeechRecognition: any;

interface ChatMessage {
  sender: 'User' | 'Bot';
  text: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('Voice Agent');

  recognizedText = signal('');
  isRecording = signal(false);
  chatHistory = signal<ChatMessage[]>([]);

  private recognition: any;
  private silenceTimer: any;
  private readonly SILENCE_DELAY = 1500;

  constructor(
    private zone: NgZone,
    private aiService: AiService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initSpeechRecognition();
  }

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

          this.resetSilenceTimer();
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

  resetSilenceTimer() {
    clearTimeout(this.silenceTimer);

    if (this.recognizedText().trim()) {
      this.silenceTimer = setTimeout(() => {
        this.zone.run(() => {
          this.sendMessage();
        });
      }, this.SILENCE_DELAY);
    }
  }

  sendMessage() {
    clearTimeout(this.silenceTimer);

    const userText = this.recognizedText().trim();

    if (!userText) {
      return;
    }

    if (this.isRecording()) {
      this.recognition.stop();
    }

    this.chatHistory.update((history) => [
      ...history,
      {
        sender: 'User',
        text: userText,
      },
    ]);

    this.recognizedText.set('');

    this.chatHistory.update((history) => [
      ...history,
      {
        sender: 'Bot',
        text: 'Thinking...',
      },
    ]);

    // Fixed syntax to use .subscribe() and passing the userText in the payload
    // Note: Change 'message' to whatever key your backend API expects (e.g., 'prompt', 'text', 'query')
    this.http.post('http://localhost:8000/chat', { message: userText }).subscribe({
      next: (response: any) => {
        const answer = response.answer || 'Sorry, I could not generate a response.';

        this.chatHistory.update((history) => {
          const updatedHistory = [...history];

          updatedHistory[updatedHistory.length - 1] = {
            sender: 'Bot',
            text: answer,
          };

          return updatedHistory;
        });

        this.speakText(answer);
      },

      error: (error) => {
        console.error('AI API Error:', error);

        this.chatHistory.update((history) => {
          const updatedHistory = [...history];

          updatedHistory[updatedHistory.length - 1] = {
            sender: 'Bot',
            text: 'Unable to connect to AI service.',
          };

          return updatedHistory;
        });
      },
    });
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
      console.warn('Text-to-speech is not supported in this browser.');
    }
  }
}
