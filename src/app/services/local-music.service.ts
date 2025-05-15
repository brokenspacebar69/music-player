import { Injectable } from '@angular/core';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { Platform } from '@ionic/angular';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';

@Injectable({ providedIn: 'root' })
export class LocalMusicService {
  constructor(
    private file: File,
    private platform: Platform,
    private androidPermissions: AndroidPermissions
  ) {}

  async getLocalMp3Files(): Promise<any[]> {
    await this.platform.ready();

    if (this.platform.is('android')) {
      const result = await this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE);
      if (!result.hasPermission) {
        await this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE);
      }
    }

    const dirPath = this.file.externalRootDirectory || this.file.dataDirectory;
    const files = await this.file.listDir(dirPath!, 'Music');
    return files
      .filter(file => file.isFile && file.name.endsWith('.mp3'))
      .map(file => ({
        name: file.name,
        localPath: file.nativeURL,  
        isLocal: true,
      }));
  }
}
