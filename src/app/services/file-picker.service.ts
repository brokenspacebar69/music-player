// Path: src/app/services/file-picker.service.ts

import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from 'capacitor-file-picker';
import { LocalMusicService } from './local-music.service';
import { Track } from '../models/track.model';

@Injectable({ providedIn: 'root' })
export class FilePickerService {
  constructor(private localMusicService: LocalMusicService) {}

  async pickAudioFile(): Promise<{ name: string; path: string | null, webPath?: string }[] | null> {
    if (Capacitor.getPlatform() === 'web') return null;

    try {
      const result = await FilePicker.showFilePicker({ fileTypes: ['audio/*'] });
      if (!result || !Array.isArray(result)) return null;

      return result.map((file: any) => ({
        name: file.name,
        path: file.path || null,
        webPath: file.webPath || null,
      }));
    } catch (error) {
      console.error('Error picking audio file:', error);
      return null;
    }
  }

  async onFileSelected(event: any): Promise<Track | null> {
    const file = event.target.files[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      const meta = await this.localMusicService.readAudioMetadata(file);
      return {
        title: meta.title || 'Unknown Title',
        artist: meta.artist || 'Unknown Artist',
        image: meta.image || 'assets/placeholder.png',
        fileUrl,
        isLocal: true,
      };
    }
    return null;
  }
}
