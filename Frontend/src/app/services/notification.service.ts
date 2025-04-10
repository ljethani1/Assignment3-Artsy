import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  message: string;
  type: 'success' | 'danger';
  id: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();
  private counter = 0;

  show(message: string, type: 'success' | 'danger') {
    const id = this.counter++;
    const notification: Notification = { id, message, type };
    const current = this.notificationsSubject.getValue();
    this.notificationsSubject.next([notification, ...current]);

    setTimeout(() => this.dismiss(id), 3000); // Auto-dismiss after 3s
  }

  dismiss(id: number) {
    const current = this.notificationsSubject.getValue();
    this.notificationsSubject.next(current.filter(n => n.id !== id));
  }
}
