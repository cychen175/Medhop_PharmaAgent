import { Component, ElementRef, Inject, Renderer2, ViewChild } from '@angular/core';
import { ChatService } from '../services/chat.service';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ChangeModelRequest, SettingService } from '../services/setting.service';
import { SnackbarService, SnackbarType } from '../services/snackbar.service';
import { UploadComponent } from '../upload/upload.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, UploadComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  public isNewChat: boolean = false;
  public changeModelRequest: ChangeModelRequest = new ChangeModelRequest();
  public isChangingModel: boolean = false;

  @ViewChild('changeLlmModelModal') changeLlmModelModal!: ElementRef<HTMLDivElement>;
  @ViewChild('ragSettingsModal') ragSettingsModal!: ElementRef<HTMLDivElement>;
  @ViewChild('uploadPDFMModal') uploadPDFMModal!: ElementRef<HTMLDivElement>;

  constructor(
    private chatService: ChatService,
    private modal: NgbModal,
    private settingService: SettingService,
    private snackbarService: SnackbarService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.chatService.isNewChat$.subscribe(isNew => {
      this.isNewChat = isNew.isNewChat;
      console.log('HeaderComponent - isNewChat:', this.isNewChat);
    }
  )}

  public refreshPage(): void {
    window.location.reload();
  }

  public startNewChat(): void {
    this.chatService.isNewChat$.next({ isNewChat: true, sessionIndex: -1 });
  }

  public openChangeLlmModelModal(): void {
    this.changeModelRequest = new ChangeModelRequest();
    this.modal.open(this.changeLlmModelModal, { centered: true, modalDialogClass: "modal-dialog-w-513 font-noto-sans-tc"});
  }

  public openRagSettingsModal(): void {
    this.changeModelRequest = new ChangeModelRequest();
    this.modal.open(this.ragSettingsModal, { centered: true, modalDialogClass: "modal-dialog-w-513 font-noto-sans-tc"});
  }

  public openUploadPDFMModal(): void {
    this.changeModelRequest = new ChangeModelRequest();
    this.modal.open(this.uploadPDFMModal, { centered: true, modalDialogClass: "modal-dialog-w-513 font-noto-sans-tc"});
  }

  public changeModel(): void {
    this.isChangingModel = true;
    this.settingService.changeModel(this.changeModelRequest).subscribe({
      next: (response) => {
        this.isChangingModel = false;
        this.snackbarService.showSnackbar(SnackbarType.SUCCESS, '', '模型切換成功，請開始新的對話', 5000);
        this.modal.dismissAll();
        this.chatService.changedModel$.next(true);
      },
      error: (error) => {
        this.isChangingModel = false;
        this.snackbarService.showSnackbar(SnackbarType.ERROR, '', '切換模型失敗', 5000);
      }
    });
  }

  public toggleSidebar(): void {
    const hasClass = this.document.body.classList.contains('toggled');
    if (hasClass) {
      this.renderer.removeClass(this.document.body, 'toggled');
    } else {
      this.renderer.addClass(this.document.body, 'toggled');
    }
  }
}
