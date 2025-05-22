import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { FilePickerService } from '../services/file-picker.service';
import { StorageService } from '../services/storage.service';
import { PlayerService } from '../services/player.service';
import { DeezerService } from '../services/deezer.service';
import { Track } from '../models/track.model';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnDestroy {
  searchQuery = '';
  searchResults: any[] = [];
  isSearching = false;

  currentTrack: Track | null = null;
  playlist: Track[] = [];
  uploadedTracks: Track[] = [];
  isPlaying = false;
  showPlaylist = false;

  currentTime = 0;
  trackDuration = 0;
  progress = 0;
  isExpanded = false;
  isSeeking = false;
  albumMap: { [album: string]: Track[] } = {};
  newAlbumName = '';
  selectedAlbum = '';
  visibleAlbums = new Set<string>();
  private subscriptions = new Subscription();
  

  constructor(
    private http: HttpClient,
    private platform: Platform,
    private filePickerService: FilePickerService,
    public storageService: StorageService,
    private playerService: PlayerService,
    private deezerService: DeezerService
  ) {
    
    this.loadUploadedTracks();
    this.loadPlaylist();
    this.loadAlbums();

    this.subscriptions.add(
      this.playerService.currentTrack$.subscribe(track => (this.currentTrack = track))
    );

    this.subscriptions.add(
      this.playerService.isPlaying$.subscribe(val => (this.isPlaying = val))
    );

    this.subscriptions.add(
      this.playerService.trackDuration$.subscribe(dur => (this.trackDuration = dur))
    );

    this.subscriptions.add(
      this.playerService.currentTime$.subscribe(time => {
        if (!this.isSeeking) {
          this.currentTime = time;
          this.progress = this.trackDuration ? this.currentTime / this.trackDuration : 0;
        }
      })
    );
  }

  get albumNames(): string[] {
    return Object.keys(this.albumMap);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private async loadUploadedTracks(): Promise<void> {
    try {
      this.uploadedTracks = await this.storageService.getUploadedTracks();
    } catch (e) {
      console.error('Error loading uploaded tracks:', e);
    }
  }

  private async loadPlaylist(): Promise<void> {
    try {
      this.playlist = await this.storageService.getPlaylists() || [];
    } catch (e) {
      console.error('Error loading playlist:', e);
    }
  }

  private async loadAlbums(): Promise<void> {
    try {
      this.albumMap = await this.storageService.getAlbums() || {};
    } catch (e) {
      console.error('Error loading albums:', e);
    }
  }

  async createAlbumPrompt(): Promise<void> {
    const alert = document.createElement('ion-alert');
    alert.header = 'New Album';
    alert.inputs = [{ name: 'name', type: 'text', placeholder: 'Album name' }];
    alert.buttons = [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Create',
        handler: async (data) => {
          const name = data.name.trim();
          if (name && !this.albumMap[name]) {
            this.albumMap[name] = [];
            await this.storageService.setAlbums(this.albumMap);
          }
        }
      }
    ];
    document.body.appendChild(alert);
    await alert.present();
  }

  async addTrackToAlbum(track: Track): Promise<void> {
    const alert = document.createElement('ion-alert');
    alert.header = 'Select Album';
    alert.inputs = Object.keys(this.albumMap).map(name => ({
      type: 'radio',
      label: name,
      value: name
    }));
    alert.buttons = [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Add',
        handler: async (albumName) => {
          if (!this.albumMap[albumName].some(t => t.fileUrl === track.fileUrl)) {
            this.albumMap[albumName].unshift(track);
            await this.storageService.setAlbums(this.albumMap);
          }
        }
      }
    ];
    document.body.appendChild(alert);
    await alert.present();
  }

  toggleAlbumVisibility(name: string): void {
    if (this.visibleAlbums.has(name)) {
      this.visibleAlbums.delete(name);
    } else {
      this.visibleAlbums.add(name);
    }
  }
  
  async renameAlbum(oldName: string): Promise<void> {
    const alert = document.createElement('ion-alert');
    alert.header = 'Rename Album';
    alert.inputs = [{ name: 'name', type: 'text', value: oldName }];
    alert.buttons = [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Rename',
        handler: async (data) => {
          const newName = data.name.trim();
          if (newName && newName !== oldName && !this.albumMap[newName]) {
            this.albumMap[newName] = this.albumMap[oldName];
            delete this.albumMap[oldName];
            if (this.visibleAlbums.has(oldName)) {
              this.visibleAlbums.delete(oldName);
              this.visibleAlbums.add(newName);
            }
            await this.storageService.setAlbums(this.albumMap);
          }
        }
      }
    ];
    document.body.appendChild(alert);
    await alert.present();
  }

  async deleteAlbum(name: string): Promise<void> {
    delete this.albumMap[name];
    this.visibleAlbums.delete(name);
    await this.storageService.setAlbums(this.albumMap);
  }
  
  triggerFileInput(): void {
    if (Capacitor.getPlatform() === 'web') {
      (document.getElementById('fileInput') as HTMLInputElement)?.click();
    } else {
      this.pickAudioFileOnAndroid();
    }
  }

  private async pickAudioFileOnAndroid(): Promise<void> {
    try {
      const newTrack = await this.filePickerService.pickAudioFile();
    if (newTrack) {
      const exists = this.uploadedTracks.some(t => t.fileUrl === newTrack.fileUrl);
      if (!exists) {
        this.uploadedTracks = [newTrack, ...this.uploadedTracks];
        await this.storageService.setUploadedTracks(this.uploadedTracks);
      }}
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error picking audio file on Android:', errorMessage);
      alert('Failed to pick audio file: ' + errorMessage);
    }
  }

  async onWebFileSelected(event: Event): Promise<void> {
    const newTrack = await this.filePickerService.onFileSelected(event);
  if (newTrack) {
    const exists = this.uploadedTracks.some(t => t.fileUrl === newTrack.fileUrl);
    if (!exists) {
      this.uploadedTracks = [newTrack, ...this.uploadedTracks];
      await this.storageService.setUploadedTracks(this.uploadedTracks);
    }
  }}

  async searchMusic(): Promise<void> {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }
    this.isSearching = true;
    try {
      const results = await this.deezerService.searchTracks(this.searchQuery);
      this.searchResults = results.map(track => ({
        title: track.title,
        artist: { name: track.artist?.name || 'Unknown Artist' },
        album: {
          title: track.album?.title || 'Unknown Album',
          cover_medium: track.album?.cover_medium || 'assets/placeholder.png',
        },
        preview: track.preview || null,
      }));
    } catch (e) {
      console.error('Deezer search error:', e);
    } finally {
      this.isSearching = false;
    }
  }

  playStream(track: any): void {
    if (!track.preview) {
      alert('Preview not available');
      return;
    }
    const metaTrack: Track = {
      title: track.title,
      artist: track.artist.name,
      album: track.album.title,
      image: track.album?.cover_medium || 'assets/placeholder.png',
      fileUrl: track.preview,
      isLocal: false,
    };
    this.playerService.play(metaTrack);
  }

  playAudio(fileUrl?: string): void {
    const track = fileUrl
      ? this.playlist.find(t => t.fileUrl === fileUrl) || this.uploadedTracks.find(t => t.fileUrl === fileUrl)
      : this.currentTrack;

    if (track) this.playerService.play(track);
  }

  pauseAudio(): void {
    this.playerService.pause();
  }

  stopAudio(): void {
    this.playerService.stop();
  }

  toggleMiniPlayerPlay(): void {
    this.isPlaying ? this.playerService.pause() : this.playerService.resume();
  }

  stopAndClosePlayer(): void {
    this.stopAudio();           
    this.currentTrack = null;   
  }
  
  async addToPlaylist(track: Track): Promise<void> {
    if (!this.playlist.some(t => t.fileUrl === track.fileUrl)) {
      this.playlist.unshift(track);
      await this.storageService.setPlaylists(this.playlist);
    }
  }

  deleteFromPlaylist(index: number): void {
    this.playlist.splice(index, 1);
    this.storageService.setPlaylists(this.playlist);
  }

  togglePlaylistView(): void {
    this.showPlaylist = !this.showPlaylist;
  }

  playPreviousSong(): void {
    const list = this.playlist.length ? this.playlist : this.uploadedTracks;
    const idx = list.findIndex(t => t.fileUrl === this.currentTrack?.fileUrl);
    if (idx > 0) this.playAudio(list[idx - 1].fileUrl);
  }

  playNextSong(): void {
    const list = this.playlist.length ? this.playlist : this.uploadedTracks;
    const idx = list.findIndex(t => t.fileUrl === this.currentTrack?.fileUrl);
    if (idx >= 0 && idx < list.length - 1) this.playAudio(list[idx + 1].fileUrl);
  }

  async deleteUploadedTrack(index: number): Promise<void> {
    const track = this.uploadedTracks[index];
    this.uploadedTracks.splice(index, 1);
    await this.storageService.setUploadedTracks(this.uploadedTracks);   
    this.playlist = this.playlist.filter(t => t.fileUrl !== track.fileUrl);
    await this.storageService.setPlaylists(this.playlist);
    
    for (const albumName of Object.keys(this.albumMap)) {
      this.albumMap[albumName] = this.albumMap[albumName].filter(t => t.fileUrl !== track.fileUrl);
    }
    await this.storageService.setAlbums(this.albumMap);
    if (this.currentTrack?.fileUrl === track.fileUrl) {
      this.stopAndClosePlayer();
   }
  }
  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  onSeekStart(): void {
    this.isSeeking = true;
  }

  onSeekChange(event: any): void {
    const newTime = event.detail.value;
    this.currentTime = newTime;
    this.progress = this.trackDuration ? this.currentTime / this.trackDuration : 0;
  }

  onSeekEnd(event: any): void {
    this.playerService.seekTo(event.detail.value);
    this.isSeeking = false;
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}
