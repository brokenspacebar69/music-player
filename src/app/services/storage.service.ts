import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Track } from '../models/track.model';

@Injectable({ providedIn: 'root' })
export class StorageService {
  constructor(private storage: Storage) {
    this.storage.create();
  }

  async getFavorites(): Promise<any[]> {
    return (await this.storage.get('favorites')) || [];
  }

  async setFavorites(data: any[]): Promise<void> {
    await this.storage.set('favorites', data);
  }

  async getPlaylists(): Promise<Track[]> {
    return (await this.storage.get('playlist')) || [];
  }

  async setPlaylists(data: Track[]): Promise<void> {
    try {
      await this.storage.set('playlist', data);
      console.log('Playlist saved:', data);
    } catch (error) {
      console.error('Error saving playlist:', error);
    }
  }

  async getUploadedTracks(): Promise<Track[]> {
    return (await this.storage.get('uploadedTracks')) || [];
  }

  async setUploadedTracks(data: Track[]): Promise<void> {
    await this.storage.set('uploadedTracks', data);
  }

  async getAlbums(): Promise<{ [album: string]: Track[] }> {
    return (await this.storage.get('albums')) || {};
  }

  async setAlbums(albums: { [album: string]: Track[] }): Promise<void> {
    await this.storage.set('albums', albums);
  }
}
