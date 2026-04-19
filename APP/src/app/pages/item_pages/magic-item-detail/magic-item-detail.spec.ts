import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MagicItemDetailComponent } from './magic-item-detail';

describe('MagicItemDetailComponent', () => {
  let component: MagicItemDetailComponent;
  let fixture: ComponentFixture<MagicItemDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MagicItemDetailComponent],
    })
    .compileComponents();

    fixture = TestBed.createComponent(MagicItemDetailComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
