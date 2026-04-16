import { TestBed } from '@angular/core/testing';

import { Monster } from './monster';

describe('Monster', () => {
  let service: Monster;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Monster);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
