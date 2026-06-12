import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AiService {

  constructor(private http: HttpClient) {}

  askAI(message: string) {
    return this.http.post<any>(
      'http://localhost:8000/chat',
      { message }
    );
  }
}
