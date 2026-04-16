import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Home } from './pages/home/home';
import { BackgroundDetail } from './pages/background-detail/background-detail';
import { Manual } from './pages/manual/manual';
import { ClassDetail } from './pages/class-detail/class-detail';
import { ItemDetail } from './pages/item-detail/item-detail';
import { MonsterDetail } from './pages/monster-detail/monster-detail';
import { RaceDetail } from './pages/race-detail/race-detail';
import { SpellDetail } from './pages/spell-detail/spell-detail';

export const routes: Routes = [
    {
    path: 'login',
    component: Login,
    title: 'Login',
  },
  {
    path: 'register',
    component: Register,
    title: 'Register',
  },
  {
    path: '',
    component: Home,
    title: 'Home',
  },
  {
    path: 'manual',
    component: Manual,
    title: 'Manual',
  },
  {
    path: 'races/:index',
    component: RaceDetail,
    title: 'Race Details',
  },
  {
    path: 'classes/:index',
    component: ClassDetail,
    title: 'Class Details',
  },
  {
    path: 'backgrounds/:id',
    component: BackgroundDetail,
    title: 'Background Details',
  },
  {
    path: 'spells/:id',
    component: SpellDetail,
    title: 'Spell Details',
  },
  {
    path: 'monsters/:id',
    component: MonsterDetail,
    title: 'Monster Details',
  },
  {
    path: 'items/:id',
    component: ItemDetail,
    title: 'Item Details',
  },
];
