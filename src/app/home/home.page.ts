import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Howl } from 'howler';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { App } from '@capacitor/app';
import { Platform } from '@ionic/angular';

// Manual inline module declaration for capacitor-file-picker
declare module 'capacitor-file-picker' {
  export interface FilePickerResult {
    files?: Array<{
      name: string;
      path?: string;
      webPath?: string;
    }>;
    documents?: Array<{
      name: string;
      path?: string;
      webPath?: string;
    }>;
  }
}

import { FilePicker } from 'capacitor-file-picker';
declare var jsmediatags: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  sound: Howl | undefined;
  selectedFileName?: string;
  searchQuery: string = '';
  searchResults: any[] = [];
  isSearching = false;
  currentTrackImage: SafeUrl | string = 'assets/placeholder.png';
  currentTrack: { title: string; artist: string; image: string } | null = null;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private platform: Platform
  ) {
    this.initializeAppStateListeners();
  }

  initializeAppStateListeners() {
    App.addListener('pause', () => {
      this.sound?.pause();
    });

    if (this.platform.is('android')) {
      App.addListener('backButton', () => {
        if (this.sound?.playing()) {
          this.sound.pause();
        } else {
          App.exitApp();
        }
      });
    }
  }

  async pickAudioFile() {
    if (Capacitor.getPlatform() === 'web') {
      document.getElementById('fileInput')?.click();
    } else {
      try {
        const result = await FilePicker.showFilePicker({ fileTypes: ['audio/*'] });
        const files = result.files || result.documents || [];
        if (files.length > 0) {
          const file = files[0];
          this.selectedFileName = file.name;
          const fileUrl = file.path || file.webPath;
          if (fileUrl) {
            this.playAudio(fileUrl);
            this.currentTrack = {
              title: file.name,
              artist: 'Local File',
              image: 'assets/placeholder.png',
            };
          } else {
            alert('File path is not available on this platform.');
          }
        }
      } catch (error) {
        console.error('Error picking audio file:', error);
      }
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileName = file.name;
      const fileUrl = URL.createObjectURL(file);
      this.readAudioMetadata(file);
      this.playAudio(fileUrl);
    }
  }

  readAudioMetadata(file: File) {
    jsmediatags.read(file, {
      onSuccess: (tag: any) => {
        const title = tag.tags.title || file.name;
        const artist = tag.tags.artist || 'Unknown Artist';
        let imageUrl = 'assets/placeholder.png';
        if (tag.tags.picture) {
          const { data, format } = tag.tags.picture;
          const byteArray = new Uint8Array(data);
          const blob = new Blob([byteArray], { type: format });
          imageUrl = URL.createObjectURL(blob);
        }
        this.currentTrack = { title, artist, image: imageUrl };
      },
      onError: () => {
        this.currentTrack = { title: file.name, artist: 'Unknown Artist', image: 'assets/placeholder.png' };
      },
    });
  }

  playAudio(fileUrl?: string) {
    if (fileUrl) {
      this.sound?.unload();
      this.sound = new Howl({ src: [fileUrl], html5: true });
      this.sound.play();
    } else {
      this.sound?.play();
    }
  }

  pauseAudio() {
    this.sound?.pause();
  }

  stopAudio() {
    this.sound?.stop();
  }

  searchMusic() {
    if (!this.searchQuery.trim()) return;
    this.isSearching = true;
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(this.searchQuery)}`;
    const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
    this.http.get(proxyUrl).subscribe(
      (response: any) => {
        this.searchResults = response.data || [];
        this.isSearching = false;
      },
      (error) => {
        console.error('Search error:', error);
        this.isSearching = false;
      }
    );
  }

  playStream(track: any) {
    this.sound?.unload();
    const previewUrl = track.preview;
    if (previewUrl) {
      this.selectedFileName = `${track.title} - ${track.artist.name}`;
      this.sound = new Howl({ src: [previewUrl], html5: true });
      this.sound.play();
      this.currentTrack = {
        title: track.title,
        artist: track.artist.name,
        image: track.album.cover_medium || 'assets/placeholder.png',
      };
    } else {
      alert('Preview not available for this track');
    }
  }
}
