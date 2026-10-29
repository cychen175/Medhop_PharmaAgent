import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  public snackBar$ = new BehaviorSubject<Snackbar>(new Snackbar());

  constructor() { }

  public showSnackbar(type: SnackbarType, title: string, message: string, duration: number): void {
    this.snackBar$.next({ isShowing: true, title, type, message, duration });
  }
}

export class Snackbar {
  isShowing: boolean
  type: SnackbarType;
  title: string;
  message: string;
  duration: number;

  constructor() {
    this.isShowing = false;
    this.type = SnackbarType.SUCCESS;
    this.title = '';
    this.message = '';
    this.duration = 3000;
  }
}

export enum SnackbarType {
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info'
}
