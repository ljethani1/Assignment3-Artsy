import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { interval, Subscription, filter } from 'rxjs';
import { formatDistanceToNowStrict, differenceInSeconds } from 'date-fns';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css']
})
export class FavoritesComponent implements OnInit, OnDestroy {
  user: any = null;
  favorites: any[] = [];
  loading = true;

  private timeSub!: Subscription;
  private navSub!: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.fetchUserFavorites();

    this.timeSub = interval(1000).subscribe(() => {
      this.favorites = [...this.favorites];
    });

    this.navSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.router.url === '/favorites') {
          this.fetchUserFavorites();
        }
      });
  }

  fetchUserFavorites() {
    this.authService.getProfile().subscribe({
      next: (user) => {
        this.user = user;
        this.favorites = user?.favorites
          ?.map((artist: any) => ({
            ...artist,
            addedAt: new Date(artist.addedAt || Date.now())
          }))
          .sort((a: any, b: any) => b.addedAt - a.addedAt) || [];
        this.loading = false;
      },
      error: () => {
        this.user = null;
        this.favorites = [];
        this.loading = false;
      }
    });
  }


getRelativeTime(date: Date): string {
  const secondsAgo = differenceInSeconds(new Date(), new Date(date));
  
  if (secondsAgo < 60) {
    return `${secondsAgo} second${secondsAgo === 1 ? '' : 's'} ago`;
  }

  return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}


  removeFavorite(artistId: string): void {
    this.authService.removeFavorite(artistId).subscribe({
      next: () => {
        this.favorites = this.favorites.filter(a => a.id !== artistId);
        this.authService.setUser({
          ...this.user,
          favorites: this.user.favorites.filter((a: any) => a.id !== artistId)
        });
        this.notificationService.show('Removed from favorites', 'danger');
      },
      error: (err) => console.error('Failed to remove favorite', err)
    });
  }

  navigateToArtist(artist: any): void {
    this.router.navigate(['/search'], {
      queryParams: { artistId: artist.id, tab: 'info' }
    });
  }

  getImageUrl(artist: any): string {
    const fallback = '/static/artsy_logo.svg';
    const imageUrl = artist.imageUrl || artist.thumbnail || artist._links?.thumbnail?.href || '';
    return !imageUrl || imageUrl.includes('missing_image.png') ? fallback : imageUrl;
  }

  ngOnDestroy(): void {
    this.timeSub?.unsubscribe();
    this.navSub?.unsubscribe();
  }
}
