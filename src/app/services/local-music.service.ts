// src/app/services/local-music.service.ts
import { Injectable } from '@angular/core';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import * as jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';
import { Platform } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class LocalMusicService {
  constructor(
    private file: File,
    private androidPermissions: AndroidPermissions,
    private platform: Platform
  ) {}

  async requestAndroidPermissions(): Promise<void> {
    if (!this.platform.is('android')) return;

    const readPerm = this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE;
    const result = await this.androidPermissions.checkPermission(readPerm);
    if (!result.hasPermission) {
      await this.androidPermissions.requestPermission(readPerm);
    }
  }

  readAudioMetadata(file: Blob): Promise<{ title: string; artist: string; image: string }> {
    return new Promise((resolve) => {
      jsmediatags.read(file, {
        onSuccess: (tag: { tags: { title?: string; artist?: string; picture?: any } }) => {
          const { title = 'Unknown Title', artist = 'Unknown Artist', picture } = tag.tags;
          const image = picture ? this.convertPictureToUrl(picture) : 'assets/placeholder.png';
          resolve({ title, artist, image });
        },
        onError: () => {
          resolve({ title: 'Unknown Title', artist: 'Unknown Artist', image: 'assets/placeholder.png' });
        },
      });
    });
  }

  private convertPictureToUrl(picture: any): string {
    const byteArray = new Uint8Array(picture.data);
    const blob = new Blob([byteArray], { type: picture.format });
    return URL.createObjectURL(blob);
  }
}