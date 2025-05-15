import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({ providedIn: 'root' })
export class StorageService {
  constructor(private storage: Storage) {
    this.storage.create();
  }

  async getSearchHistory(): Promise<string[]> {
    return (await this.storage.get('searchHistory')) || [];
  }

  async setSearchHistory(history: string[]): Promise<void> {
    await this.storage.set('searchHistory', history);
  }

  async getFavorites(): Promise<any[]> {
    return (await this.storage.get('favorites')) || [];
  }

  async setFavorites(favorites: any[]): Promise<void> {
    await this.storage.set('favorites', favorites);
  }

  async getPlaylists(): Promise<any[]> {
    return (await this.storage.get('playlists')) || [];
  }

  async setPlaylists(playlists: any[]): Promise<void> {
    await this.storage.set('playlists', playlists);
  }
}
