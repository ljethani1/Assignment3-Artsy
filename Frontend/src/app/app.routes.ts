import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { FavoritesComponent } from './components/favorites/favorites.component';
import { SearchComponent } from './components/search/search.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    children: [
      { path: 'search', component: SearchComponent },
      { path: 'search/:artistId/:tab', component: SearchComponent }, // ✅ Handles tabs via route
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'favorites', component: FavoritesComponent },
      { path: '', redirectTo: 'search', pathMatch: 'full' },
    ],
  }
];
