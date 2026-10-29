import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ChatService, ConversationHistoriesResp, IsNewChat } from '../services/chat.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { Observable, map, catchError, of, forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SnackbarService, SnackbarType } from '../services/snackbar.service';
import { InputExample, INPUT_DOCTOR_EXAMPLES, INPUT_PHARMACIST_EXAMPLES } from '../shared/input-example';
import { error } from 'console';
import { OcrUploadComponent } from '../ocr-upload/ocr-upload.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, OcrUploadComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements AfterViewInit, OnInit, OnDestroy {
  public sessions: ConversationHistoriesResp[] = [];
  public isNewChat: IsNewChat = { isNewChat: true, sessionIndex: -1 };
  public userName: string = '';
  public isOpenSatisfy: boolean = false;
  public rating: number = 5;
  public comment: string = '';
  public isReplyEnd: boolean = false;
  public isScrollAtBottom: boolean = true;
  public modelName: string = '';

  public newMessage: string = '';
  public currentAssistantMessage: string = '';
  public currentUserMessage: string = '';
  public isResponsing: boolean = false;
  public isResTyping: boolean = false;
  private latestConversationId: string = '';
  public agentList: { agentName: string, agent: string, description: string }[] =
    [
      { agentName: '醫師', agent: 'doctor', description: '請輸入處方及所有藥品清單，我將進行藥物整合調整建議'},
      { agentName: '藥師', agent: 'pharmacist', description: '請輸入處方藥品、缺貨藥品及替代藥品，我將進行交互作用檢查'}
    ];
  public selectedAgent: { agentName: string, agent: string, description: string } = this.agentList[1];

  public doctorInputExamples: InputExample[] = INPUT_DOCTOR_EXAMPLES;
  public pharmacistInputExamples: InputExample[] = INPUT_PHARMACIST_EXAMPLES;

  public isGettingVlmPrescription: boolean = false;

  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('noSessionContent') noSessionContent!: ElementRef<HTMLDivElement>;
  @ViewChild('startExperienceModal') startExperienceModal!: ElementRef<HTMLDivElement>;
  @ViewChild('uploadPrescriptionModal') uploadPrescriptionModal!: ElementRef<HTMLDivElement>;
  @ViewChildren('star') stars!: QueryList<ElementRef>; // 獲取所有星星元素
  @ViewChild('feedbackWidget') feedbackWidget!: ElementRef; // 評價視窗元素

  private resizeListener: () => void;

  constructor(
    private chatService: ChatService,
    private modal: NgbModal,
    private sanitizer: DomSanitizer,
    private snackbarService: SnackbarService,
  ) {
    this.markInit();
    this.getModel();

    this.resizeListener = () => {
      this.adjustNoSessionHeight();
      this.adjustTextareaHeight();
      this.adjustMessagesHeight();
    };

    // 持續接收歷史對話列表資料
    this.chatService.sessions$.subscribe(sessions => {
      this.sessions = sessions;
      console.log('chat.component - sessions updated:', this.sessions);
    });

    // 持續接收是否為新對話的通知 以及session index
    this.chatService.isNewChat$.subscribe(isNew => {
      this.isNewChat = isNew;
      if (isNew.isNewChat && isNew.sessionIndex === -1) {
        this.openNewChat();
      } else if (!isNew.isNewChat && isNew.sessionIndex >= 0) {
        this.selectSession(this.sessions[isNew.sessionIndex], isNew.sessionIndex);
      }
    });

    this.chatService.changedModel$.subscribe(changed => {
      if (changed) this.getModel();
    });

    this.chatService.vllmPrescriptionText$.subscribe(text => {
      if (text) {
        this.isGettingVlmPrescription = true;
        this.newMessage += `${text} \n\n `;
        this.adjustTextareaHeight();
      } else {
        this.isGettingVlmPrescription = false;
      }
    });
  }

  ngOnInit(): void {
    window.addEventListener('resize', this.resizeListener);
    this.updateIsNewChat(true, -1);
  }

  ngAfterViewInit(): void {
    this.focusInput();
    this.adjustTextareaHeight();
    this.adjustNoSessionHeight();

    if (!this.userName) this.modal.open(this.startExperienceModal, { centered: true, modalDialogClass: "font-noto-sans-tc", windowClass: 'start-experience-modal-content', backdrop: 'static' });
  }

  public openUploadPrescriptionModal(): void {
    this.isGettingVlmPrescription = false;
    this.modal.open(this.uploadPrescriptionModal, { centered: true, modalDialogClass: "modal-dialog-w-80vw font-noto-sans-tc", windowClass: 'uploadPrescription-modal-content', backdrop: 'static' });
  }

  private openNewChat(): void {
    this.isOpenSatisfy = false;
    this.rating = 5;
    this.comment = '';
    this.isReplyEnd = false;
    this.isScrollAtBottom = true;
    this.newMessage = '';
    this.currentAssistantMessage = '';
    this.currentUserMessage = '';
    this.isResponsing = false;
    this.isResTyping = false;
    this.getHistoryList();

    this.runWithDelay(() => {
      this.adjustNoSessionHeight();
    });
  }

  public selectSession(session: ConversationHistoriesResp, index: number): void {
    this.isReplyEnd = false;
    this.currentUserMessage = session.question;
    this.currentAssistantMessage = session.content;
    this.latestConversationId = session.id;
    this.selectedAgent = this.agentList.find(agent => agent.agent === session.agent) || this.agentList[0];

    setTimeout(() => {
      this.adjustMessagesHeight();
      this.scrollToBottom();
    }, 10);
  }

  private getHistoryList(): void {
    this.chatService.getHistoryListByChat(this.userName);
  }

  public startUsing(): void {
    this.modal.dismissAll();
    this.getHistoryList();
  }

  public setInputExample(inputExample: InputExample): void {
    this.newMessage = inputExample.example;
  }

  private updateIsNewChat(isNewChat: boolean, sessionIndex: number): void {
    this.chatService.isNewChat$.next({ isNewChat, sessionIndex });
  }

  public selectAgent(agent: { agentName: string, agent: string, description: string }): void {
    this.selectedAgent = agent;
    this.newMessage = '';
  }

  public sendMessage(): void {
    if (!this.canSendMessage()) return;

    this.isReplyEnd = false;
    this.setRating(5);
    this.comment = '';
    this.adjustTextareaHeight();

    this.isResponsing = true;
    this.currentUserMessage = this.newMessage.trim();
    this.newMessage = '';
    this.currentAssistantMessage = '';
    this.chatService.isReplying$.next(!this.isReplyEnd);

    this.chatService.sendChatMessage(this.userName, this.currentUserMessage, this.selectedAgent.agent)
    .subscribe({
      next: (chunk) => {
          // console.log('chunk: ', chunk);
          this.currentAssistantMessage += chunk.content || '';

          if (chunk.conversationId) this.latestConversationId = chunk.conversationId;

          this.adjustMessagesHeight();
          this.isResponsing = false;

          // setTimeout(() => {
          //   if (this.isScrollAtBottom) {
          //     this.scrollToBottom();
          //   }
          // }, 1000);
        },
        error: (e) => {
          // console.error('Error sending message:', e);
          this.currentAssistantMessage = '回應失敗，請更換問題或稍後再試。';
          this.isResponsing = false;
          this.isReplyEnd = true;
          this.chatService.isReplying$.next(!this.isReplyEnd);
          this.updateIsNewChat(false, -1);
        },
        complete: () => {
          this.isReplyEnd = true;
          this.chatService.isReplying$.next(!this.isReplyEnd);
          this.updateIsNewChat(false, -1);
          this.getHistoryList();
        }
    });
  }

  private scrollToBottom(): void {
    this.runWithDelay(() => {
      if (this.messagesContainer && this.messagesContainer.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
        this.isScrollAtBottom = true;
      }
    });
  }

  public checkScrollPosition(): void {
    if (this.messagesContainer && this.messagesContainer.nativeElement) {
      const container = this.messagesContainer.nativeElement;
      this.isScrollAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
    }
    // console.log('isScrollAtBottom: ' + this.isScrollAtBottom);
  }

  public canSendMessage(): boolean {
    if (this.isResponsing || this.isResTyping) {
      return false;
    }

    return !!this.newMessage.trim();
  }

  private focusInput(): void {
    this.runWithDelay(() => {
      if (this.messageInput && this.messageInput.nativeElement) {
        this.messageInput.nativeElement.focus();
      }
    });
  }

  // 初始化 marked.js 的 renderer
  private markInit(): void {
    const renderer = new marked.Renderer();

    // 自訂 link renderer 強制把連結做成會跳轉到新視窗的格式
    renderer.link = (href: string | null, title: string | null, text: string): string => {
      if (!href) return text;

      // 以防XSS
      const escapeHtml = (str: string) => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      };

      const safeHref = escapeHtml(href);
      const safeTitle = title ? ` title="${escapeHtml(title)}"` : '';

      return `<br><a href="${safeHref}" target="_blank" rel="noopener noreferrer"${safeTitle}>${text}</a>`;
    };

    marked.use({ renderer });
    marked.setOptions({ async: false }); // 設定 marked 為同步模式
  }

  private runWithDelay(callback: () => void): void {
    setTimeout(callback, 0);
  }

  public adjustTextareaHeight(): void {
    this.runWithDelay(() => {
      if (this.messageInput && this.messageInput.nativeElement) {
        const textarea = this.messageInput.nativeElement;
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 150);
        textarea.style.height = `${newHeight}px`;

        this.adjustMessagesHeight();
      }
    });
  }

  private adjustMessagesHeight(): void {
    if (this.messagesContainer && this.messagesContainer.nativeElement) {
      const inputArea = document.querySelector('.main-input-area');
      const inputHeight = inputArea ? inputArea.clientHeight : 0;
      const availableHeight = window.innerHeight - inputHeight - 165;
      this.messagesContainer.nativeElement.style.maxHeight = `${availableHeight}px`;
    }
  }

  private adjustNoSessionHeight(): void {
    if (this.noSessionContent && this.noSessionContent.nativeElement) {
      const availableHeight = window.innerHeight - 165;
      this.noSessionContent.nativeElement.style.maxHeight = `${availableHeight}px`;
    }
  }

  public handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  public handleKeyUp(event: KeyboardEvent): void {
    const textarea = event.target as HTMLTextAreaElement;

    if (event.key === 'Enter' && event.ctrlKey) {
      this.newMessage = this.newMessage + '\n';
      this.adjustTextareaHeight();
      return;
    }

    if (event.key === 'Enter' && !event.ctrlKey && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      this.sendMessage();
      return;
    }

    this.adjustTextareaHeight();
  }

  // 解析 Markdown 並轉為 SafeHtml
  public getSafeHtml(content: string): SafeHtml {
    if (!content) return this.sanitizer.bypassSecurityTrustHtml('');
    const html = marked.parse(content) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  public closeModal(): void {
    this.modal.dismissAll();
  }

  public canSubmitName(): boolean {
    return this.userName.length > 2;
  }

  public openSatisfy(): void {
    this.isOpenSatisfy = true;
  }

  // 處理星星點擊事件
  public setRating(value: number): void {
    this.rating = value;
    this.updateStarDisplay();
  }

  // 更新星星的 active 類別
  private updateStarDisplay(): void {
    this.stars.forEach((star, index) => {
      const starElement = star.nativeElement as HTMLElement;
      if (index < this.rating) {
        starElement.classList.add('active');
      } else {
        starElement.classList.remove('active');
      }
    });
  }

  public submitFeedback(): void {
    console.log('提交評價：', { rating: this.rating, comment: this.comment });
    this.isOpenSatisfy = false;
    this.isReplyEnd = false;

    this.chatService.saveComment({
      name: this.userName,
      rating: this.rating,
      suggestion: this.comment,
      conversationId: this.latestConversationId
    }).subscribe({
      next: (response) => {
        this.snackbarService.showSnackbar(SnackbarType.SUCCESS, '', '感謝您的回饋！', 5000);
        console.log('評價提交成功:', response);
      },
      error: (error) => {
        this.snackbarService.showSnackbar(SnackbarType.ERROR, '', '儲存回饋失敗', 5000);
        console.error('評價提交失敗:', error);
      }
    });
  }

  private getModel(): void {
    this.chatService.getModel().subscribe({
      next: (response) => {
        this.modelName = response.modelName;
        console.log('目前模型:', response.modelName);
      },
      error: (error) => {
        this.snackbarService.showSnackbar(SnackbarType.ERROR, '', '取得模型失敗', 5000);
        console.error('取得模型失敗:', error);
      }
    })
  }

  // 監聽全域點擊事件
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpenSatisfy && this.feedbackWidget) {
      const target = event.target as HTMLElement;
      const feedbackToggleBtn = (event.target as HTMLElement).closest('.feedback-toggle-btn');
      const clickedInsideWidget = this.feedbackWidget.nativeElement.contains(target);

      // 如果點擊不在視窗內且不是切換按鈕，關閉視窗
      if (!clickedInsideWidget && !feedbackToggleBtn) {
        this.isOpenSatisfy = false;
      }
    }
  }

  public confirmVlmPrescription(): void {
    this.closeModal();
  }

  public cancelOcrAndClose(): void {
    this.chatService.cancelOcrUpload$.next(true);
    this.chatService.vllmPrescriptionText$.next('');
    this.modal.dismissAll();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeListener);
  }
}
