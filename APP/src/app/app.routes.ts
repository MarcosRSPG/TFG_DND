import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
    title: 'Login',
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.Register),
    title: 'Register',
  },
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.Home),
    title: 'Home',
  },
  {
    path: 'manual',
    loadComponent: () => import('./pages/manual/manual').then(m => m.Manual),
    title: 'Manual',
  },
  {
    path: 'races/:index',
    loadComponent: () => import('./pages/race-detail/race-detail').then(m => m.RaceDetail),
    title: 'Race Details',
  },
  {
    path: 'classes/:index',
    loadComponent: () => import('./pages/class-detail/class-detail').then(m => m.ClassDetail),
    title: 'Class Details',
  },
  {
    path: 'backgrounds/:id',
    loadComponent: () => import('./pages/background-detail/background-detail').then(m => m.BackgroundDetail),
    title: 'Background Details',
  },
  {
    path: 'spells/:id',
    loadComponent: () => import('./pages/spell-detail/spell-detail').then(m => m.SpellDetail),
    title: 'Spell Details',
  },
  {
    path: 'monsters/:id',
    loadComponent: () => import('./pages/monster-detail/monster-detail').then(m => m.MonsterDetail),
    title: 'Monster Details',
  },
  {
    path: 'items/:type/:id',
    loadComponent: () => import('./pages/item_pages/item-detail-page/item-detail-page').then(m => m.ItemDetailPageComponent),
    title: 'Item Details',
  },
];