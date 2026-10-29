import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Observer } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  public isNewChat$ = new BehaviorSubject<IsNewChat>({ isNewChat: true, sessionIndex: -1 });
  public sessions$ = new BehaviorSubject<ConversationHistoriesResp[]>([]);
  public isReplying$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public changedModel$ = new BehaviorSubject<boolean>(false);
  public vllmPrescriptionText$ = new BehaviorSubject<string>('');
  public cancelOcrUpload$ = new BehaviorSubject<boolean>(false);

  private readonly backendUrl: string = environment.backend;
  constructor(private httpClient: HttpClient) { }

  public sendChatMessage(userName: string, userInput: string, agent: string): Observable<ChatResponse> {
    return new Observable<ChatResponse>((observer: Observer<ChatResponse>) => {
      const url = `${this.backendUrl}/chat?agent=${agent}`;

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({userName, userInput, agent}),
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get response body reader');
        }

        let buffer = '';
        const decoder = new TextDecoder();

        const readStream = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              if (buffer) {
                this.processBuffer(buffer, observer);
              }
              observer.complete();
              return;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              this.processBuffer(line, observer);
            }

            readStream();
          }).catch(err => {
            observer.error(err);
          });
          };

          readStream();
          })
          .catch(err => {
            observer.error(err);
        });

      return () => {};
    });
  }

  private processBuffer(line: string, observer: Observer<ChatResponse>): void {
    if (line.startsWith('data: ')) {
      const data = line.substring(6);
      if (data === '[DONE]') {
        observer.complete();
      } else if (data.startsWith('[ERROR]')) {
        observer.error(new Error(data));
      } else if (data) {
        try {
          const chunk = JSON.parse(data);
          const response: ChatResponse = {
            content: chunk.content || '',
            conversationId: chunk.conversationId || undefined
          };
          observer.next(response);
        } catch (e) {
          console.error('Failed to parse chunk:', data, e);
          observer.error(new Error('Failed to parse chunk'));
        }
      }
    }
  }

  public saveComment(comment: Comment): Observable<CommonResponse> {
    return this.httpClient.post<CommonResponse>(`${this.backendUrl}/v1/feedback`, comment);
  }

  private getHistoryList(userName: string): Observable<ConversationHistoriesResp[]> {
    return this.httpClient.get<ConversationHistoriesResp[]>(`${this.backendUrl}/history?username=${userName}`);
  }

  public getHistoryListByChat(userName: string): void {
    this.getHistoryList(userName).subscribe({
      next: (response) => {
        this.sessions$.next(response);
      }
    })
  }

  public getModel(): Observable<GetModel> {
    return this.httpClient.get<GetModel>(`${this.backendUrl}/agent/getModel`);
  }
}

export interface Comment {
  name: string;
  rating: number;
  suggestion: string;
  conversationId: string;
}

export interface CommonResponse {
  status: number;
  error: string | null;
  message: string | null;
}

export interface ChatResponse {
  content: string;
  conversationId: string;
}

export class ConversationHistoriesResp {
  id: string = '';
  userName: string = '';
  agent: string = '';
  question: string = '';
  content: string = '';
}

export type IsNewChat = {
  isNewChat: boolean,
  sessionIndex: number
}

export interface GetModel {
  modelName: string;
}
