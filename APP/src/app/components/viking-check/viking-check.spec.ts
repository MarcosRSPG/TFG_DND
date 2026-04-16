import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VikingCheck } from './viking-check';

describe('VikingCheck', () => {
  let component: VikingCheck;
  let fixture: ComponentFixture<VikingCheck>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VikingCheck]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VikingCheck);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
