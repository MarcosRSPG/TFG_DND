import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolDetailComponent } from './tool-detail';

describe('ToolDetailComponent', () => {
  let component: ToolDetailComponent;
  let fixture: ComponentFixture<ToolDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToolDetailComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
