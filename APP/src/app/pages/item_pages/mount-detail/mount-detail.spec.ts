import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MountDetailComponent } from './mount-detail';

describe('MountDetailComponent', () => {
  let component: MountDetailComponent;
  let fixture: ComponentFixture<MountDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MountDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MountDetailComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
