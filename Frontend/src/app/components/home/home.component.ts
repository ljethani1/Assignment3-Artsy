import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  user: any = null;

  constructor(public authService: AuthService, private router: Router, private notificationService: NotificationService) {}

  ngOnInit() {
    this.authService.getProfile().subscribe({
      next: (user) => this.authService.setUser(user),
      error: () => this.authService.setUser(null),
    });

    this.authService.user$.subscribe((user) => {
      this.user = user;
    });
  }

logout() {
  this.authService.logout().subscribe(() => {
    this.authService.setUser(null);
    this.router.navigate(['/search']); 
    this.notificationService.show('Logged Out', 'success');
  });
}

deleteAccount() {
  this.authService.deleteAccount().subscribe(() => {
    this.authService.setUser(null);
    this.router.navigate(['/search']); 
    this.notificationService.show('Account deleted', 'danger');
  });
}

  isActive(path: string): boolean {
    const currentUrl = this.router.url;

    if (path === '/search') {
      return currentUrl === '/' || currentUrl.startsWith('/search');
    }

    return currentUrl === path;
  }
}
