import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DinHeader } from './din-header';

describe('DinHeader', () => {
  let component: DinHeader;
  let fixture: ComponentFixture<DinHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DinHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DinHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
