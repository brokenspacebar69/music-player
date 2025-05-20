import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DeezerService {
  private corsProxy = 'https://corsproxy.io/?url=';
  private apiUrl = 'https://api.deezer.com';

  constructor(private http: HttpClient) {}

  async searchTracks(query: string): Promise<any[]> {
    try {
      const targetUrl = `${this.apiUrl}/search?q=${encodeURIComponent(query)}`;
      const proxiedUrl = `${this.corsProxy}${encodeURIComponent(targetUrl)}`;
      const response: any = await firstValueFrom(this.http.get(proxiedUrl));
      return response?.data ?? [];
    } catch (error) {
      console.error('Error searching tracks on Deezer:', error);
      return [];
    }
  }
}
