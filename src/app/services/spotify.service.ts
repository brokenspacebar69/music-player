// Path: src/app/services/spotify.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SpotifyService {
  private accessToken: string | null = null;
  private clientId = '4fff8fe371534e0f885b0a853c6c06a8';
  private clientSecret = 'd6cd23be120845169d4933721cf1826f';

  constructor(private http: HttpClient) {}

  async authenticate() {
    const body = new URLSearchParams();
    body.set('grant_type', 'client_credentials');

    const headers = new HttpHeaders({
      Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    const response: any = await firstValueFrom(
      this.http.post('https://accounts.spotify.com/api/token', body.toString(), { headers })
    );

    this.accessToken = response.access_token;
  }

  async searchTracks(query: string): Promise<any[]> {
  if (!this.accessToken) await this.authenticate();

  const headers = new HttpHeaders({
    Authorization: `Bearer ${this.accessToken}`,
  });

  try {
    const response: any = await firstValueFrom(
      this.http.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`, { headers })
    );
    return response.tracks?.items || [];
  } catch (error: any) {
    
    if (error.status === 401) {
      this.accessToken = null;
      await this.authenticate();
      return this.searchTracks(query); 
    }
    throw error;
  }
}
}

