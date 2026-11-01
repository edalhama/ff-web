import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {map, Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {ApiResponse} from '../../models/api';
import {TasksState} from '../../models/tasks';

/** Gestión de tareas: el programador, cada tarea de sincronización y las incidencias. */
@Injectable({providedIn: 'root'})
export class TasksApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.api.url}admin`;

  state(): Observable<TasksState> {
    return this.http.get<ApiResponse<TasksState>>(`${this.endpoint}/tasks`).pipe(map((response) => response.data as TasksState));
  }

  /**
   * Manda un correo de prueba a esa dirección, en el acto (sin cola): si el transporte falla,
   * la API responde 502 con el motivo del proveedor (el interceptor lo enseña).
   */
  sendTestEmail(email: string): Observable<{email: string; mailer: string}> {
    return this.http
      .post<ApiResponse<{email: string; mailer: string}>>(`${this.endpoint}/tools/test-email`, {email})
      .pipe(map((response) => response.data as {email: string; mailer: string}));
  }

  /** Cierra una incidencia a mano y devuelve el estado ya actualizado. */
  resolve(incidentId: number): Observable<TasksState> {
    return this.http
      .put<ApiResponse<TasksState>>(`${this.endpoint}/incidents/${incidentId}/resolve`, {})
      .pipe(map((response) => response.data as TasksState));
  }
}
