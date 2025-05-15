import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DeezerService {
  private baseUrl = 'https://api.deezer.com';

  constructor(private http: HttpClient) {}

  // Search for tracks based on query
  searchTracks(query: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/search?q=${query}`);
  }

  // Get artist details
  getArtist(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/artist/${id}`);
  }

  // Get album details
  getAlbum(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/album/${id}`);
  }

  // Get track details
  getTrack(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/track/${id}`);
  }

  // Get user playlists (optional)
  getUserPlaylists(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/user/${userId}/playlists`);
  }
}
