import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

const authOnly = [authGuard];

export const routes: Routes = [
  // Static routes first
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    title: 'Login',
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
    title: 'Register',
  },
  {
    path: 'user',
    loadComponent: () => import('./pages/user-profile/user-profile').then((m) => m.UserProfile),
    canActivate: authOnly,
    title: 'My Account',
  },
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'Home',
  },
  {
    path: 'manual',
    loadComponent: () => import('./pages/manual/manual').then((m) => m.Manual),
    title: 'Manual',
  },
  // Character routes (new before :id)
  {
    path: 'characters',
    loadComponent: () => import('./pages/characters/characters').then((m) => m.Characters),
    canActivate: authOnly,
    title: 'Mis Personajes',
  },
  {
    path: 'characters/new',
    loadComponent: () =>
      import('./pages/character-form/character-form').then((m) => m.CharacterForm),
    canActivate: authOnly,
    title: 'Nuevo Personaje',
  },
  {
    path: 'manual/print',
    loadComponent: () => import('./pages/manual-print/manual-print').then((m) => m.ManualPrint),
    title: 'Print Selection',
  },
  // Sheet route MUST be before :id to avoid capture
  {
    path: 'characters/:id/sheet',
    loadComponent: () =>
      import('./pages/character-sheet/character-sheet').then((m) => m.CharacterSheet),
    canActivate: authOnly,
    title: 'Character Sheet',
  },
  {
    path: 'characters/:id',
    loadComponent: () =>
      import('./pages/character-detail/character-detail').then((m) => m.CharacterDetail),
    canActivate: authOnly,
    title: 'Personaje',
  },

  // Create routes BEFORE detail routes
  {
    path: 'backgrounds/new',
    loadComponent: () =>
      import('./pages/background-form/background-form').then((m) => m.BackgroundForm),
    canActivate: authOnly,
    title: 'Create Background',
  },
  {
    path: 'spells/new',
    loadComponent: () => import('./pages/spell-form/spell-form').then((m) => m.SpellForm),
    canActivate: authOnly,
    title: 'Create Spell',
  },
  {
    path: 'monsters/new',
    loadComponent: () => import('./pages/monster-form/monster-form').then((m) => m.MonsterForm),
    canActivate: authOnly,
    title: 'Create Monster',
  },
  // Item create routes - one per type
  {
    path: 'items/adventuringgear/new',
    loadComponent: () =>
      import('./pages/item-forms/adventuring-gear-form/adventuring-gear-form').then(
        (m) => m.AdventuringGearForm,
      ),
    canActivate: authOnly,
    title: 'Create Adventuring Gear',
  },
  {
    path: 'items/armor/new',
    loadComponent: () =>
      import('./pages/item-forms/armor-form/armor-form').then((m) => m.ArmorForm),
    canActivate: authOnly,
    title: 'Create Armor',
  },
  {
    path: 'items/weapon/new',
    loadComponent: () =>
      import('./pages/item-forms/weapon-form/weapon-form').then((m) => m.WeaponForm),
    canActivate: authOnly,
    title: 'Create Weapon',
  },
  {
    path: 'items/magicitem/new',
    loadComponent: () =>
      import('./pages/item-forms/magic-item-form/magic-item-form').then((m) => m.MagicItemForm),
    canActivate: authOnly,
    title: 'Create Magic Item',
  },
  {
    path: 'items/tool/new',
    loadComponent: () => import('./pages/item-forms/tool-form/tool-form').then((m) => m.ToolForm),
    canActivate: authOnly,
    title: 'Create Tool',
  },
  {
    path: 'items/mount/new',
    loadComponent: () =>
      import('./pages/item-forms/mount-form/mount-form').then((m) => m.MountForm),
    canActivate: authOnly,
    title: 'Create Mount/Vehicle',
  },

  // Edit routes - MUST come before detail routes
  {
    path: 'backgrounds/edit/:id',
    loadComponent: () =>
      import('./pages/background-form/background-form').then((m) => m.BackgroundForm),
    canActivate: authOnly,
    title: 'Edit Background',
  },
  {
    path: 'spells/edit/:id',
    loadComponent: () => import('./pages/spell-form/spell-form').then((m) => m.SpellForm),
    canActivate: authOnly,
    title: 'Edit Spell',
  },
  {
    path: 'monsters/edit/:id',
    loadComponent: () => import('./pages/monster-form/monster-form').then((m) => m.MonsterForm),
    canActivate: authOnly,
    title: 'Edit Monster',
  },
  // Item edit routes - one per type
  {
    path: 'items/adventuringgear/edit/:id',
    loadComponent: () =>
      import('./pages/item-forms/adventuring-gear-form/adventuring-gear-form').then(
        (m) => m.AdventuringGearForm,
      ),
    canActivate: authOnly,
    title: 'Edit Adventuring Gear',
  },
  {
    path: 'items/armor/edit/:id',
    loadComponent: () =>
      import('./pages/item-forms/armor-form/armor-form').then((m) => m.ArmorForm),
    canActivate: authOnly,
    title: 'Edit Armor',
  },
  {
    path: 'items/weapon/edit/:id',
    loadComponent: () =>
      import('./pages/item-forms/weapon-form/weapon-form').then((m) => m.WeaponForm),
    canActivate: authOnly,
    title: 'Edit Weapon',
  },
  {
    path: 'items/magicitem/edit/:id',
    loadComponent: () =>
      import('./pages/item-forms/magic-item-form/magic-item-form').then((m) => m.MagicItemForm),
    canActivate: authOnly,
    title: 'Edit Magic Item',
  },
  {
    path: 'items/tool/edit/:id',
    loadComponent: () => import('./pages/item-forms/tool-form/tool-form').then((m) => m.ToolForm),
    canActivate: authOnly,
    title: 'Edit Tool',
  },
  {
    path: 'items/mount/edit/:id',
    loadComponent: () =>
      import('./pages/item-forms/mount-form/mount-form').then((m) => m.MountForm),
    canActivate: authOnly,
    title: 'Edit Mount/Vehicle',
  },

  // Detail routes with parameters (must come AFTER specific routes)
  {
    path: 'races/:id',
    loadComponent: () => import('./pages/race-detail/race-detail').then((m) => m.RaceDetail),
    title: 'Race Details',
  },
  {
    path: 'classes/:id',
    loadComponent: () => import('./pages/class-detail/class-detail').then((m) => m.ClassDetail),
    title: 'Class Details',
  },
  {
    path: 'backgrounds/:id',
    loadComponent: () =>
      import('./pages/background-detail/background-detail').then((m) => m.BackgroundDetail),
    title: 'Background Details',
  },
  {
    path: 'spells/:id',
    loadComponent: () => import('./pages/spell-detail/spell-detail').then((m) => m.SpellDetail),
    title: 'Spell Details',
  },
  {
    path: 'monsters/:id',
    loadComponent: () =>
      import('./pages/monster-detail/monster-detail').then((m) => m.MonsterDetail),
    title: 'Monster Details',
  },
  {
    path: 'items/:type/:id',
    loadComponent: () =>
      import('./pages/item_pages/item-detail-page/item-detail-page').then(
        (m) => m.ItemDetailPageComponent,
      ),
    title: 'Item Details',
  },
];
