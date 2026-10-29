import { Component } from '@angular/core';
import { ChatService, ConversationHistoriesResp, IsNewChat } from '../services/chat.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  public sessions: ConversationHistoriesResp[] = [];
  public isNewChat: IsNewChat = { isNewChat: true, sessionIndex: -1 };
  public isReplying: boolean = false;

  constructor(
    private chatService: ChatService,
    private modal: NgbModal,
  ) {
    this.chatService.isReplying$.subscribe(isReplying => {
      this.isReplying = isReplying;
    });

    // 持續接收歷史對話列表資料
    this.chatService.sessions$.subscribe(sessions => {
      this.sessions = sessions;
      console.log('chat.component - sessions updated:', this.sessions);
    });

    // 持續接收是否為新對話的通知 以及session index
    this.chatService.isNewChat$.subscribe(isNew => {
      this.isNewChat = isNew;
      // console.log("this.isNewChat: "+this.isNewChat.sessionIndex);
    });
  }

  public selectSession(index: number): void {
    if (this.isReplying) return;
    this.chatService.isNewChat$.next({ isNewChat: false, sessionIndex: index });
  }

  public refreshPage(): void {
    window.location.reload();
  }
}
