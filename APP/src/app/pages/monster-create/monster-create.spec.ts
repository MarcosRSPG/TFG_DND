import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonsterCreate } from './monster-create';

describe('MonsterCreate', () => {
  let component: MonsterCreate;
  let fixture: ComponentFixture<MonsterCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonsterCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonsterCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
