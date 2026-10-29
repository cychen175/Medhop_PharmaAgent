import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Snackbar, SnackbarService } from '../services/snackbar.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './snackbar.component.html',
  styleUrl: './snackbar.component.css'
})
export class SnackbarComponent {
  private destroy$ = new Subject();

  public snackbar: Snackbar = new Snackbar();

  constructor(
    private snackbarService: SnackbarService
  ) {
    this.snackbarService.snackBar$.pipe(takeUntil(this.destroy$)).subscribe(snackbar => {
      this.snackbar = snackbar;
      this.showSnackbar();
    })
  }

  private showSnackbar(): void {
    setTimeout(() => {
      this.snackbar.isShowing = false;
    }, this.snackbar.duration);
  }

  public close(): void {
    this.snackbar.isShowing = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
