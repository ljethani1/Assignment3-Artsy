import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { faStar as solidStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as regularStar } from '@fortawesome/free-regular-svg-icons';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

declare var bootstrap: any;

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {
  private API_URL = window.location.hostname.includes('localhost') ? 'http://localhost:3000/api' : '/api';

  query = '';
  submitted = false;
  loading = false;
  errorMessage = '';
  results: any[] = [];
  selectedArtist: any = null;
  artistDetails: any = null;
  artworks: any[] = [];
  artworksLoading = false;
  activeTab: 'info' | 'artworks' = 'info';
  artistLoading = false;
  user: any = null;
  favorites: Set<string> = new Set();
  selectedArtwork: any = null;
  categories: any[] = [];
  loadingCategories = false;
  similarArtists: any[] = [];
  selectedArtistId: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public authService: AuthService,
    private notificationService: NotificationService,
    private iconLibrary: FaIconLibrary
  ) {
    iconLibrary.addIcons(solidStar, regularStar);
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const artistId = params['artistId'];
      const tab = params['tab'] || 'info';
      this.activeTab = tab;
      if (!artistId) {
        this.clear();
        return;
      }
      if (this.artistDetails?.id !== artistId) {
        this.selectedArtist = { id: artistId };
        this.selectedArtistId = artistId;
        this.fetchArtist(artistId);
      }
    });

    this.authService.user$.subscribe(user => {
      this.user = user;
      this.favorites = new Set(user?.favorites?.map((f: any) => f.id) || []);
    });
  }

  search(): void {
    const q = this.query.trim();
    if (!q) return;

    this.submitted = true;
    this.loading = true;
    this.results = [];
    this.selectedArtist = null;
    this.errorMessage = '';

    this.http.get<any[]>(`${this.API_URL}/search`, { params: { q } }).subscribe({
      next: res => {
        this.results = res;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to fetch search results.';
        this.loading = false;
      }
    });
  }

  clear(): void {
    this.query = '';
    this.submitted = false;
    this.results = [];
    this.selectedArtist = null;
    this.artistDetails = null;
    this.artworks = [];
    this.similarArtists = [];
    this.errorMessage = '';
    this.loading = false;

    this.router.navigate([], {
      queryParams: { artistId: null, tab: null },
      queryParamsHandling: 'merge'
    });
  }

  selectArtist(artist: any): void {
    const artistId = this.getArtistId(artist);
    if (!artistId) return;

    this.selectedArtist = artist;
    this.selectedArtistId = artistId;
    this.activeTab = 'info';
    this.fetchArtist(artistId);

    this.router.navigate([], {
      queryParams: { artistId, tab: 'info' },
      queryParamsHandling: 'merge'
    });
  }

  switchTab(tab: 'info' | 'artworks'): void {
    this.activeTab = tab;
    const currentArtistId = this.getArtistId(this.selectedArtist);
    if (!currentArtistId) return;

    this.router.navigate([], {
      queryParams: { artistId: currentArtistId, tab },
      queryParamsHandling: 'merge'
    });
  }

  fetchArtist(artistId: string): void {
    this.artistDetails = null;
    this.artworks = [];
    this.similarArtists = [];
    this.artistLoading = true;
    this.artworksLoading = true;

    this.http.get<any>(`${this.API_URL}/artist/${artistId}`).subscribe({
      next: res => {
        this.artistDetails = res;
        this.artistLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to fetch artist info.';
        this.artistLoading = false;
      }
    });

    this.http.get<any>(`${this.API_URL}/artworks/${artistId}`).subscribe({
      next: res => {
        this.artworks = res._embedded?.artworks || [];
        this.artworksLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to fetch artworks.';
        this.artworksLoading = false;
      }
    });

    this.http.get<any>(`${this.API_URL}/similar/${artistId}`).subscribe({
      next: res => {
        const rawArtists = res._embedded?.artists || [];
        this.similarArtists = rawArtists.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          thumbnail: artist._links?.thumbnail?.href || '',
          _links: artist._links
        }));
      },
      error: err => {
        if ([401, 403].includes(err.status)) {
          this.similarArtists = [];
        }
      }
    });
  }

  toggleFavorite(artist: any, event: Event): void {
    event.stopPropagation();
    const artistId = this.getArtistId(artist);
    if (!artistId) return;

    const isFav = this.favorites.has(artistId);
    const action = isFav
      ? this.authService.removeFavorite(artistId)
      : this.authService.addFavorite(artistId);

    action.subscribe({
      next: () => {
        if (isFav) {
          this.favorites.delete(artistId);
          this.notificationService.show('Removed from favorites', 'danger');
        } else {
          this.favorites.add(artistId);
          this.notificationService.show('Added to favorites', 'success');
        }

        this.favorites = new Set(this.favorites);
      },
      error: err => console.error('Favorite error:', err)
    });
  }

  isFavorite(artist: any): boolean {
    const id = this.getArtistId(artist);
    return id ? this.favorites.has(id) : false;
  }

  openCategoriesModal(art: any): void {
    this.selectedArtwork = art;
    this.categories = [];
    this.loadingCategories = true;

    const modalEl = document.getElementById('categoriesModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }

    this.http.get<any>(`${this.API_URL}/categories/${art.id}`).subscribe({
      next: res => {
        this.categories = res._embedded?.genes || [];
        this.loadingCategories = false;
      },
      error: () => {
        this.categories = [];
        this.loadingCategories = false;
      }
    });
  }

  getImageUrl(entity: any): string {
    const thumb = entity.thumbnail || entity._links?.thumbnail?.href || '';
    const isMissing = thumb.includes('missing_image.png') || !thumb;
    return isMissing ? '/static/artsy_logo.svg' : thumb;
  }

  getArtistId(artist: any): string | null {
    if (!artist) return null;
    if (artist.id) return artist.id;

    const link = artist._links?.self?.href;
    return link ? link.split('/').pop()?.split('.')[0] : null;
  }

  trackByArtist(index: number, artist: any): any {
    return artist.id || index;
  }

  splitParagraphs(biography: string): string[] {
    return biography
      .split(/\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }
}
