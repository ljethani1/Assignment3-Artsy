import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']

})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  message = ''; 
  nameTouched = false;
  emailTouched = false;
  passwordTouched = false;


  constructor(private authService: AuthService, private router: Router) {}

  navigateToLogin(event: Event) {
    event.preventDefault();
    this.router.navigate(['/login']);
  }

  register() {
    this.authService.register({
      name: this.name,
      email: this.email,
      password: this.password,
    }).subscribe({
      next: () => {
        this.authService.login({ email: this.email, password: this.password }).subscribe({
          next: (res) => {
            this.authService.setUser(res.user);
            this.router.navigate(['/search']);
          },
          error: () => {
            this.message = 'Registered but auto-login failed. Try logging in manually.';
          }
        });
      },
      error: (err) => {
        this.message = err.error?.message || 'Registration failed.';
      }
    });
  }
}
