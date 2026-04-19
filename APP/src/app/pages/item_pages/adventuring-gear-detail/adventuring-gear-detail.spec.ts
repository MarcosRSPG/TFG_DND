import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdventuringGearDetailComponent } from './adventuring-gear-detail';

describe('AdventuringGearDetailComponent', () => {
  let component: AdventuringGearDetailComponent;
  let fixture: ComponentFixture<AdventuringGearDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdventuringGearDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdventuringGearDetailComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
