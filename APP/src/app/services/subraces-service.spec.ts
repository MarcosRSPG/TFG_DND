import { TestBed } from '@angular/core/testing';

import { SubracesService } from './subraces-service';

describe('SubracesService', () => {
  let service: SubracesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubracesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
