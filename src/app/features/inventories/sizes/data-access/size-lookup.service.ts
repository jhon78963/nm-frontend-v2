import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { SizeType } from '../models/size.model';
import { adaptSizeTypes } from './size.adapter';

@Service()
export class SizeLookupService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getSizeTypes(): Observable<SizeType[]> {
    return this.http
      .get<unknown>(`${this.api}/sizes/size-types`)
      .pipe(map(adaptSizeTypes));
  }
}
