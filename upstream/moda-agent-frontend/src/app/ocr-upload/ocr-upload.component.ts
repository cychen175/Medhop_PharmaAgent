import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../services/chat.service';
import { Clipboard } from '@angular/cdk/clipboard';
import { SnackbarService, SnackbarType } from '../services/snackbar.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';

interface SupportedFormat {
  mime: string[];
  extensions: string[];
  name: string;
}

// 統一管理支援的圖片格式
const SUPPORTED_FORMATS: SupportedFormat[] = [
  { mime: ['image/jpeg'], extensions: ['.jpg', '.jpeg', '.jpe'], name: 'JPEG' },
  { mime: ['image/png'],  extensions: ['.png'],                name: 'PNG' },
  { mime: ['image/gif'],  extensions: ['.gif'],                name: 'GIF' },
  { mime: ['image/webp'], extensions: ['.webp'],               name: 'WebP' },
  { mime: ['image/bmp', 'image/x-bmp'], extensions: ['.bmp'], name: 'BMP' }
];

// 自動衍生屬性
const ALL_MIME_TYPES = SUPPORTED_FORMATS.flatMap(f => f.mime);
const ALL_EXTENSIONS = SUPPORTED_FORMATS.flatMap(f => f.extensions);
const ACCEPT_ATTRIBUTE = SUPPORTED_FORMATS.map(f => f.mime[0]).join(',');
const SUPPORTED_NAMES = SUPPORTED_FORMATS.map(f => f.name).join(' / ');

@Component({
  selector: 'app-ocr-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ocr-upload.component.html',
  styleUrls: ['./ocr-upload.component.scss']
})
export class OcrUploadComponent {
  private readonly backendUrl: string = environment.backend;

  private http = inject(HttpClient);

  public previewUrl: string | null = null;
  public file: File = new File([], '');
  public vlmText: string = '';
  public isDragging = false;
  public isUploading = false;
  public errorMessage: string | null = null;

  public showMagnifier = false;
  public magnifierX = 0;
  public magnifierY = 0;
  public backgroundPos = '0% 0%';
  public backgroundSize = '450%';

  public supportedFormats = SUPPORTED_NAMES;
  public acceptAttribute = ACCEPT_ATTRIBUTE;

  private readonly MAX_WIDTH = 4096;
  private readonly MAX_HEIGHT = 3840;

  // 用來儲存當前上傳的訂閱，方便取消
  private uploadSubscription?: Subscription;

  constructor(
    private clipboard: Clipboard,
    private chatService: ChatService,
    private snackbarService: SnackbarService,
    private modal: NgbModal,
  ) {
    this.chatService.cancelOcrUpload$.subscribe(cancel => {
      if (cancel) this.reset();
    });
  }

  // 放大鏡效果
  public onMouseMove(event: MouseEvent) {
    const glass = event.currentTarget as HTMLElement;
    const img = glass.querySelector('.original-image') as HTMLImageElement;
    if (!img) return;

    // 取得圖片在容器中的位置與尺寸
    const rect = img.getBoundingClientRect();

    // 計算鼠標相對於圖片的座標
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;

    // 限制在圖片範圍內
    x = Math.max(0, Math.min(x, rect.width));
    y = Math.max(0, Math.min(y, rect.height));

    this.showMagnifier = true;

    // 放大鏡位置：直接用圖片內的相對座標 - 放大鏡半徑，讓鼠標在中心
    const glassSize = 200; // 可調整 放大鏡大小
    const halfSize = glassSize / 2;
    this.magnifierX = x - halfSize;
    this.magnifierY = y - halfSize;

    // 背景位置計算（讓放大鏡顯示正確的局部區域）
    const bgX = (x / rect.width) * 100;
    const bgY = (y / rect.height) * 100;
    this.backgroundPos = `${bgX}% ${bgY}%`;
  }

  public onMouseLeave() {
    this.showMagnifier = false;
  }

  // 拖曳事件
  public onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  public onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  public onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  // 點擊上傳
  public onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
      input.value = '';
    }
  }

  // 檔案驗證與處理
  private handleFile(file: File) {
    const fileName = file.name.toLowerCase();
    const fileExt = fileName.slice(fileName.lastIndexOf('.'));

    // 1. MIME type 檢查
    if (!ALL_MIME_TYPES.includes(file.type)) {
      this.errorMessage = `不支援的圖片格式，僅支援：${SUPPORTED_NAMES}`;
      this.resetFileInput();
      return;
    }

    // 2. 擴展名檢查
    if (!ALL_EXTENSIONS.includes(fileExt)) {
      this.errorMessage = `檔案擴展名錯誤，允許的副檔名：${ALL_EXTENSIONS.join(' ')}`;
      this.resetFileInput();
      return;
    }

    // 3. 檔案大小檢查（10MB）
    const maxSizeMB = 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      this.errorMessage = `檔案過大，請壓縮後再上傳（小於 ${maxSizeMB}MB）`;
      this.resetFileInput();
      return;
    }

    // 4. 解析度檢查（使用 Image 物件載入圖片取得真實尺寸）
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      if (width > this.MAX_WIDTH || height > this.MAX_HEIGHT) {
        this.errorMessage = `圖片解析度過高，請使用 ${this.MAX_WIDTH}×${this.MAX_HEIGHT} 以內的圖片`;
        this.resetFileInput();
        URL.revokeObjectURL(objectUrl);
        return;
      }

      // 所有檢查通過
      this.errorMessage = null;
      this.file = file;
      this.previewUrl = objectUrl;
      this.uploadFile(file);
    };

    img.onerror = () => {
      this.errorMessage = '無法讀取圖片，請確認檔案完整';
      this.resetFileInput();
      URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;
  }

  public resetFileInput() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  public uploadFile(file: File) {
    if (!file?.name) return;

    // 先取消之前的上傳（防止同時多個請求）
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
    }

    this.chatService.vllmPrescriptionText$.next('');
    this.isUploading = true;
    this.vlmText = '';

    const formData = new FormData();
    formData.append('file', file);

    // 儲存訂閱以便之後取消
    this.uploadSubscription = this.http.post<{ success: boolean; text: string }>(
      `${this.backendUrl}/v1/documents/ocr`,
      formData
    ).subscribe({
      next: (response) => {
        this.isUploading = false;
        this.uploadSubscription = undefined; // 清除參考

        if (response.text) {
          this.vlmText = response.text;
          this.chatService.vllmPrescriptionText$.next(this.vlmText);
        } else {
          this.vlmText = '辨識失敗';
          this.chatService.vllmPrescriptionText$.next('');
        }
      },
      error: (err) => {
        this.isUploading = false;
        this.uploadSubscription = undefined;
        this.vlmText = '';
        this.errorMessage = '上傳失敗，請稍後再試';
        console.error(err);
      }
    });
  }

  public copyToClipboard(): void {
    if (this.vlmText) {
      this.clipboard.copy(this.vlmText);
      this.snackbarService.showSnackbar(SnackbarType.SUCCESS, '', '已複製!', 5000);
    }
  }

  // 重新上傳或清除圖片
  public reset() {
    this.chatService.vllmPrescriptionText$.next('');

    // 取消正在進行的上傳請求
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = undefined;
    }

    this.isUploading = false;
    this.vlmText = '';
    this.errorMessage = null;
    this.file = new File([], '');

    // 釋放預覽圖片的記憶體
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }

    this.resetFileInput();
  }

  public openPhotoModal(content: any) {
    this.modal.open(content, {
      size: 'lg',
      centered: true,
      keyboard: true
    });
  }
}
