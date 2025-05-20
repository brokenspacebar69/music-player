// src/app/home/home.page.ts
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { FilePickerService } from '../services/file-picker.service';
import { StorageService } from '../services/storage.service';
import { PlayerService } from '../services/player.service';
import { DeezerService } from '../services/deezer.service';
import { Track } from '../models/track.model';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  searchQuery = '';
  searchResults: any[] = [];
  isSearching = false;
  currentTrack: Track | null = null;
  favorites: Track[] = [];
  playlist: Track[] = [];
  uploadedTracks: Track[] = [];
  isPlaying = false;
  showPlaylist = false;
  currentTime = 0;
  trackDuration = 0;
  progress = 0;
  private progressSubscription: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private platform: Platform,
    private filePickerService: FilePickerService,
    private storageService: StorageService,
    private playerService: PlayerService,
    private deezerService: DeezerService
  ) {
    this.loadUploadedTracks();
    this.loadPlaylist();

    this.playerService.currentTrack$.subscribe(track => {
      this.currentTrack = track;
      if (track) {
        this.trackDuration = this.playerService.getTrackDuration();
        this.startProgressTracking();
      } else {
        this.stopProgressTracking();
      }
    });

    this.playerService.isPlaying$.subscribe(val => {
      this.isPlaying = val;
      if (!val) this.stopProgressTracking();
    });
  }

  private startProgressTracking() {
    this.stopProgressTracking();
    this.progressSubscription = interval(1000).subscribe(() => {
      this.currentTime = this.playerService.getCurrentTime();
      this.progress = this.currentTime / this.trackDuration;
    });
  }

  private stopProgressTracking() {
    this.progressSubscription?.unsubscribe();
    this.progressSubscription = null;
  }

  private async loadUploadedTracks() {
    try {
      this.uploadedTracks = await this.storageService.getUploadedTracks();
    } catch (error) {
      console.error('Error loading uploaded tracks:', error);
    }
  }

  private async loadPlaylist() {
    try {
      this.playlist = await this.storageService.getPlaylists() || [];
    } catch (error) {
      console.error('Error loading playlist:', error);
    }
  }

  triggerFileInput() {
    if (Capacitor.getPlatform() === 'web') {
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      fileInput?.click();
    } else {
      this.pickAudioFileOnAndroid();
    }
  }

  private async pickAudioFileOnAndroid() {
    try {
      const newTrack = await this.filePickerService.pickAudioFile();
      if (newTrack) {
        this.uploadedTracks = [newTrack, ...this.uploadedTracks]; 
        await this.storageService.setUploadedTracks(this.uploadedTracks);
        console.log('Added track:', newTrack);
        console.log('Updated uploadedTracks:', this.uploadedTracks);
      }
    } catch (err: unknown) {
      let errorMessage = 'Unknown error occurred';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      console.error('Error picking audio file on Android:', errorMessage);
      alert('Failed to pick audio file: ' + errorMessage);
    }
  }
  
  async onWebFileSelected(event: any) {
    const newTrack = await this.filePickerService.onFileSelected(event);
    if (newTrack) {
      this.uploadedTracks = [newTrack, ...this.uploadedTracks]; 
      await this.storageService.setUploadedTracks(this.uploadedTracks);
      console.log('Added track (web):', newTrack);
      console.log('Updated uploadedTracks:', this.uploadedTracks);
    }
  }

  async searchMusic() {
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
    } catch (error) {
      console.error('Deezer search error:', error);
    } finally {
      this.isSearching = false;
    }
  }

  playStream(track: any) {
    const previewUrl = track.preview;
    if (!previewUrl) {
      alert('Preview not available');
      return;
    }

    const metaTrack: Track = {
      title: track.title,
      artist: track.artist.name,
      album: track.album.title,
      image: track.album?.cover_medium || 'assets/placeholder.png',
      fileUrl: previewUrl,
      isLocal: false,
    };

    this.playerService.play(metaTrack);
    this.currentTrack = metaTrack;
  }

  playAudio(fileUrl?: string) {
    if (fileUrl) {
      const track = this.playlist.find(t => t.fileUrl === fileUrl)
        || this.uploadedTracks.find(t => t.fileUrl === fileUrl);
      if (track) {
        this.currentTrack = track;
        this.playerService.play(track);
      }
    } else if (this.currentTrack?.fileUrl) {
      this.playerService.play(this.currentTrack);
    }
  }

  pauseAudio() {
    this.playerService.pause();
  }

  stopAudio() {
    this.playerService.stop();
  }

  toggleMiniPlayerPlay() {
    this.isPlaying ? this.playerService.pause() : this.playerService.resume();
  }

  async addToPlaylist(track: Track) {
    const exists = this.playlist.some(t => t.fileUrl === track.fileUrl);
    if (!exists) {
      this.playlist.unshift(track);
      await this.storageService.setPlaylists(this.playlist);
    }
  }

  deleteFromPlaylist(index: number) {
    this.playlist.splice(index, 1);
    this.storageService.setPlaylists(this.playlist);
  }

  togglePlaylistView() {
    this.showPlaylist = !this.showPlaylist;
  }

  playPreviousSong() {
    const idx = this.playlist.findIndex(t => t.fileUrl === this.currentTrack?.fileUrl);
    if (idx > 0) this.playAudio(this.playlist[idx - 1].fileUrl);
  }

  playNextSong() {
    const idx = this.playlist.findIndex(t => t.fileUrl === this.currentTrack?.fileUrl);
    if (idx < this.playlist.length - 1) this.playAudio(this.playlist[idx + 1].fileUrl);
  }

  async deleteUploadedTrack(index: number) {
    const track = this.uploadedTracks[index];
    this.uploadedTracks.splice(index, 1);
    await this.storageService.setUploadedTracks(this.uploadedTracks);
    this.playlist = this.playlist.filter(t => t.fileUrl !== track.fileUrl);
    await this.storageService.setPlaylists(this.playlist);
  }
}