import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ProfileData,
  UpdatePasswordPayload,
  UpdateProfilePayload,
} from '../models/profile.model';
import { adaptAvatarUpload, adaptProfile } from './profile.adapter';

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'string' && err.trim()) {
    return err;
  }

  const http = err as {
    error?: { message?: string | string[] };
    message?: string;
  };

  const backendMessage = http?.error?.message;
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage;
  }
  if (Array.isArray(backendMessage) && backendMessage.length > 0) {
    return backendMessage.join(' ');
  }

  return http?.message ?? 'No se pudo completar la solicitud.';
}

@Service()
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/profile`;

  getProfile(): Observable<ProfileData> {
    return this.http.get<unknown>(this.base).pipe(
      map(adaptProfile),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  updateProfile(payload: UpdateProfilePayload): Observable<ProfileData> {
    return this.http.put<unknown>(this.base, payload).pipe(
      map(adaptProfile),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  updatePassword(payload: UpdatePasswordPayload): Observable<void> {
    return this.http.put<unknown>(`${this.base}/password`, payload).pipe(
      map(() => undefined),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }

  uploadAvatar(file: File): Observable<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.post<unknown>(`${this.base}/avatar`, formData).pipe(
      map(adaptAvatarUpload),
      catchError((err) => throwError(() => extractErrorMessage(err))),
    );
  }
}
