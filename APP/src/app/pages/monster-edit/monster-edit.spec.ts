import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonsterEdit } from './monster-edit';

describe('MonsterEdit', () => {
  let component: MonsterEdit;
  let fixture: ComponentFixture<MonsterEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonsterEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonsterEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
