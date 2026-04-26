import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemDetailPageComponent } from './item-detail-page';

describe('ItemDetailPageComponent', () => {
  let component: ItemDetailPageComponent;
  let fixture: ComponentFixture<ItemDetailPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemDetailPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemDetailPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
