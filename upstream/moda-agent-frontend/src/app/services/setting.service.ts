import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CommonResponse } from './chat.service';

@Injectable({
  providedIn: 'root'
})
export class SettingService {

  private readonly backendUrl: string = environment.backend;

  constructor(private httpClient: HttpClient) { }

  public changeModel(changeModel: ChangeModelRequest): Observable<CommonResponse> {
      return this.httpClient.post<CommonResponse>(`${this.backendUrl}/agent/changeModel`, changeModel);
  }

}

export class ChangeModelRequest {
  model: string = '';
  baseUrl: string = '';
  apiKey: string = '';
}
