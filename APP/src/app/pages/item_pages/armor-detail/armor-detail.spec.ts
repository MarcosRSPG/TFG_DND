import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArmorDetailComponent } from './armor-detail';

describe('ArmorDetailComponent', () => {
  let component: ArmorDetailComponent;
  let fixture: ComponentFixture<ArmorDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArmorDetailComponent],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArmorDetailComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
