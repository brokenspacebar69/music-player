import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DeezerService {
  private apiUrl = 'https://deezerdevs-deezer.p.rapidapi.com';

  private headers = new HttpHeaders({
    'X-RapidAPI-Key': 'b56fd73c56msh8b2134655e057b2p19a1b7jsnfc9a538ec84a',
    'X-RapidAPI-Host': 'deezerdevs-deezer.p.rapidapi.com',
  });

  constructor(private http: HttpClient) {}

  async searchTracks(query: string): Promise<any[]> {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`, {
          headers: this.headers,
        })
      );
      return response?.data ?? [];
    } catch (error) {
      console.error('Error searching tracks via RapidAPI:', error);
      return [];
    }
  }
}
