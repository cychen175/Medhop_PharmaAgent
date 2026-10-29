import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { SnackbarService, SnackbarType } from '../services/snackbar.service';
import { environment } from '../../environments/environment';

interface UploadFile {
  file: File;
  progress: number;
  status: 'waiting' | 'uploading' | 'success' | 'error';
  message?: string;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css'
})
export class UploadComponent {
  files: UploadFile[] = [];
  dragOver = false;
  hasFinishedFiles = false;

  private readonly backendUrl: string = environment.backend;

  constructor(
    private snackbarService: SnackbarService,
    private http: HttpClient
  ) {}

  public openFileInput(): void {
    const input = document.getElementById('fileInput') as HTMLInputElement;
    input?.click();
  }

  public trackByFile(index: number, item: UploadFile): any {
    return item.file.name + item.file.size;
  }

  public onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.handleFiles(Array.from(input.files));
  }

  public onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    if (event.dataTransfer?.files) this.handleFiles(Array.from(event.dataTransfer.files));
  }

  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  public onDragLeave(event: DragEvent): void {
    setTimeout(() => {
      this.dragOver = false;
    }, 100);
  }

  private handleFiles(newFiles: File[]) {
    const pdfFiles = newFiles.filter(f =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      this.snackbarService.showSnackbar(SnackbarType.ERROR, '', '請選擇PDF檔案', 5000);
      return;
    }
    if (pdfFiles.length < newFiles.length) {
      this.snackbarService.showSnackbar(SnackbarType.ERROR, '', '非PDF檔案已被忽略', 5000);
    }

    const uploadFiles: UploadFile[] = pdfFiles.map(file => ({
      file,
      progress: 0,
      status: 'waiting' as const
    }));

    this.files.push(...uploadFiles);
    this.files = [...this.files];
    this.startAllUploads();
  }

  private startAllUploads(): void {
    this.files
      .filter(f => f.status === 'waiting')
      .forEach((item, index) => this.uploadSingle(item, index));
  }

  private uploadSingle(item: UploadFile, index: number): void {
    item.status = 'uploading';
    item.progress = 1;
    this.files = [...this.files];

    const formData = new FormData();
    formData.append('file', item.file);

    this.http.post(this.backendUrl + '/v1/documents/uploadPdf', formData, {
      reportProgress: true,
      observe: 'events',
      responseType: 'json'
    }).subscribe({
      next: (event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress) {
          const percent = event.total ? Math.round(100 * event.loaded / event.total) : 99;
          item.progress = percent;
          this.files = [...this.files];
        }
        else if (event.type === HttpEventType.Response) {
          item.status = 'success';
          item.progress = 100;
          this.files = [...this.files];
          // this.snackbarService.showSnackbar(SnackbarType.SUCCESS, '', `${item.file.name} 上傳成功！`, 3000);
          this.updateHasFinishedFiles();
        }
      },
      error: (err) => {
        item.status = 'error';
        item.message = err.error?.message || '上傳失敗';
        item.progress = 0;
        this.files = [...this.files];
        this.updateHasFinishedFiles();
      }
    });
  }

  public removeFile(index: number): void {
    this.files.splice(index, 1);
    this.files = [...this.files];
    this.updateHasFinishedFiles();
  }

  public clearFinished(): void {
    this.files = this.files.filter(f => f.status === 'waiting' || f.status === 'uploading');
    this.updateHasFinishedFiles();
  }

  private updateHasFinishedFiles(): void {
    this.hasFinishedFiles = this.files.some(f => f.status === 'success' || f.status === 'error');
  }
}
