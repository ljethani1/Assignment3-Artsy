import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private API_URL = '';

  private _user = new BehaviorSubject<any>(null);
  user$ = this._user.asObservable();

  constructor(private http: HttpClient) {
    const isLocal = window.location.hostname.includes('localhost');
    this.API_URL = isLocal ? 'http://localhost:3000/api' : '/api';
  }

  setUser(user: any) {
    this._user.next(user);
  }

  get currentUser() {
    return this._user.getValue();
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/register`, data, { withCredentials: true });
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/login`, data, { withCredentials: true });
  }

  logout(): Observable<any> {
    return this.http.post(`${this.API_URL}/logout`, {}, { withCredentials: true });
  }

  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.API_URL}/delete`, { withCredentials: true });
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.API_URL}/me`, { withCredentials: true });
  }

  addFavorite(artistId: string) {
    const payload = {
      addedAt: new Date().toISOString(),
    };
    return this.http.post(`${this.API_URL}/favorite/${artistId}`, payload, {
      withCredentials: true,
    });
  }

  removeFavorite(artistId: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/favorite/${artistId}`, {
      withCredentials: true,
    });
  }

  getFavorites(): Observable<any> {
    return this.http.get(`${this.API_URL}/favorites`, { withCredentials: true });
  }
}

