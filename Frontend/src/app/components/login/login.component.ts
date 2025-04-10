import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']

})
export class LoginComponent {
  email = '';
  password = '';
  message = '';

  constructor(private authService: AuthService, private router: Router, private notificationService: NotificationService) {}

login() {
  this.authService.login({ email: this.email, password: this.password }).subscribe({
    next: (res) => {
      this.authService.setUser(res.user);
      sessionStorage.removeItem('lastResults');
      sessionStorage.removeItem('hasSearched');
      this.notificationService.show('Logged in', 'success'); 
      this.router.navigate(['/search']);
    },
    error: (err) => {
      this.message = err.error?.message || 'Login failed';
    },
  });
}



  navigateToRegister(event: Event) {
    event.preventDefault();
    this.router.navigate(['/register']);
  }

}
