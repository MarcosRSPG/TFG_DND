import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Home } from './pages/home/home';
import { Manual } from './pages/manual/manual';

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
];
