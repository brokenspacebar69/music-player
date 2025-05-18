// Path: src/app/services/local-music.service.ts

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

  async getLocalMp3Files(): Promise<any[]> {
    await this.platform.ready();

    if (this.platform.is('android')) {
      const perm = this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE;
      const result = await this.androidPermissions.checkPermission(perm);
      if (!result.hasPermission) {
        await this.androidPermissions.requestPermission(perm);
      }

      const writePerm = this.androidPermissions.PERMISSION.WRITE_EXTERNAL_STORAGE;
      const writeResult = await this.androidPermissions.checkPermission(writePerm);
      if (!writeResult.hasPermission) {
        await this.androidPermissions.requestPermission(writePerm);
      }
    }

    const dir = this.file.externalRootDirectory + 'Music/';
    try {
      const exists = await this.file.checkDir(this.file.externalRootDirectory!, 'Music');
      if (!exists) throw new Error('Music directory not found.');

      const files = await this.file.listDir(this.file.externalRootDirectory!, 'Music');
      return files
        .filter((f) => f.isFile && f.name.toLowerCase().endsWith('.mp3'))
        .map((f) => ({
          name: f.name,
          localPath: f.nativeURL,
          isLocal: true,
        }));
    } catch (err) {
      console.error('Failed accessing local music:', err);
      return [];
    }
  }

  async readAudioMetadata(file: Blob): Promise<{ title: string; artist: string; image: string }> {
    return new Promise((resolve) => {
      jsmediatags.read(file, {
        onSuccess: (tag: { tags: { title?: string; artist?: string; picture?: any } }) => {
          const { title = 'Unknown Title', artist = 'Unknown Artist', picture } = tag.tags;
          const image = picture
            ? URL.createObjectURL(new Blob([new Uint8Array(picture.data)], { type: picture.format }))
            : 'assets/placeholder.png';
          resolve({ title, artist, image });
        },
        onError: () => {
          resolve({ title: 'Unknown Title', artist: 'Unknown Artist', image: 'assets/placeholder.png' });
        },
      });
    });
  }
}
