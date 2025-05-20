import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { LocalMusicService } from './local-music.service';
import { Track } from '../models/track.model';

declare var fileChooser: any;

@Injectable({ providedIn: 'root' })
export class FilePickerService {
  constructor(private localMusicService: LocalMusicService) {}

  async pickAudioFile(): Promise<Track | null> {
    if (Capacitor.getPlatform() === 'android') {
      try {
        const uri: string = await new Promise((resolve, reject) => {
          fileChooser.open(resolve, reject);
        });

        const response = await fetch(uri);
        const blob = await response.blob();

        let meta;
        try {
          meta = await this.localMusicService.readAudioMetadata(blob);
        } catch {
          meta = { title: 'Unknown Title', artist: 'Unknown Artist', image: 'assets/placeholder.png' };
        }

        return {
          title: meta.title || 'Unknown Title',
          artist: meta.artist || 'Unknown Artist',
          image: meta.image || 'assets/placeholder.png',
          fileUrl: uri,
          isLocal: true,
        };
      } catch (err) {
        console.error('Cordova file chooser error:', err);
        return null;
      }
    } else {
      // Use capawesome file picker on iOS and Web
      try {
        const result = await FilePicker.pickFiles({ types: ['audio/*'] });
        const file = result.files?.[0] as any;
        if (!file) return null;

        const pathOrWebPath = file.webPath ?? file.path ?? '';
        if (!pathOrWebPath) {
          console.error('No valid path or webPath for picked file');
          return null;
        }

        const response = await fetch(pathOrWebPath);
        const blob = await response.blob();

        const meta = await this.localMusicService.readAudioMetadata(blob);
        const base64Audio = await this.readBlobAsBase64(blob);

        return {
          title: meta.title || 'Unknown Title',
          artist: meta.artist || 'Unknown Artist',
          image: meta.image || 'assets/placeholder.png',
          fileUrl: base64Audio,
          isLocal: true,
        };
      } catch (err) {
        console.error('File picking failed', err);
        return null;
      }
    }
  }

  async onFileSelected(event: any): Promise<Track | null> {
    const file: File = event.target.files?.[0];
    if (!file) return null;

    try {
      const meta = await this.localMusicService.readAudioMetadata(file);
      const base64Audio = await this.readFileAsBase64(file);

      return {
        title: meta.title || file.name || 'Unknown Title',
        artist: meta.artist || 'Unknown Artist',
        image: meta.image || 'assets/placeholder.png',
        fileUrl: base64Audio,
        isLocal: true,
      };
    } catch (error) {
      console.error('Error reading selected file', error);
      return null;
    }
  }

  private readBlobAsBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
