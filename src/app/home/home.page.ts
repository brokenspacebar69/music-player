// Path: src/app/home/home.page.ts

import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Platform } from '@ionic/angular';
import { FilePickerService } from '../services/file-picker.service';
import { StorageService } from '../services/storage.service';
import { LocalMusicService } from '../services/local-music.service';
import { PlayerService } from '../services/player.service';
import { SpotifyService } from '../services/spotify.service';
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
  currentTime: number = 0; // Current playback time in seconds
  trackDuration: number = 0; // Total track duration in seconds
  progress: number = 0; // Progress value (0 to 1)
  private progressSubscription: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private platform: Platform,
    private filePickerService: FilePickerService,
    private storageService: StorageService,
    private localMusicService: LocalMusicService,
    private playerService: PlayerService,
    private spotifyService: SpotifyService
  ) {
    this.loadUploadedTracks();
    this.loadPlaylist(); 

    this.playerService.currentTrack$.subscribe(track => {
      this.currentTrack = track;
      if (track) {
        this.trackDuration = this.playerService.getTrackDuration(); // Get track duration
        this.startProgressTracking();
      } else {
        this.stopProgressTracking();
      }
    });

    this.playerService.isPlaying$.subscribe(val => {
      this.isPlaying = val;
      if (!val) {
        this.stopProgressTracking();
      }
    });
  }

  private startProgressTracking() {
    this.stopProgressTracking(); // Clear any existing subscription
    this.progressSubscription = interval(1000).subscribe(() => {
      this.currentTime = this.playerService.getCurrentTime(); // Get current playback time
      this.progress = this.currentTime / this.trackDuration; // Calculate progress
    });
  }

  private stopProgressTracking() {
    if (this.progressSubscription) {
      this.progressSubscription.unsubscribe();
      this.progressSubscription = null;
    }
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

  private async loadStorageData() {
    try {
      this.favorites = await this.storageService.getFavorites() || [];
      this.playlist = await this.storageService.getPlaylists() || [];
    } catch (error) {
      console.error('Error loading storage data:', error);
    }
  }

  async pickAudioFile(event: any) {
    const newTrack = await this.filePickerService.onFileSelected(event);
    if (newTrack) {
      this.uploadedTracks = [newTrack, ...this.uploadedTracks];

      await this.storageService.setUploadedTracks(this.uploadedTracks);
    }
  }

  async searchMusic() {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    try {
      const results = await this.spotifyService.searchTracks(this.searchQuery);
      this.searchResults = results
        .filter(track => !!track.preview_url)
        .map(track => ({
          title: track.name,
          artist: { name: track.artists[0]?.name },
          album: {
            title: track.album.name,
            cover_medium: track.album.images?.[1]?.url || 'assets/placeholder.png',
            id: track.album.id,
          },
          artistId: track.artists[0]?.id,
          preview: track.preview_url,
        }));
    } catch (error) {
      console.error('Spotify search error:', error);
    } finally {
      this.isSearching = false;
    }
  }

  playStream(track: any) {
    const previewUrl = track.preview;
    if (!previewUrl) {
      alert('Preview not available for this track');
      return;
    }

    const image = track.album?.cover_medium || track.artist?.picture_medium || 'assets/placeholder.png';

    const metaTrack: Track = {
      title: track.title,
      artist: track.artist.name,
      album: track.album.title,
      albumId: track.album.id,
      artistId: track.artist.id,
      image,
      fileUrl: previewUrl,
      isLocal: false,
    };

    this.playerService.play(metaTrack);
    this.currentTrack = metaTrack;
  }

  playAudio(fileUrl?: string) {
    if (fileUrl) {
      const track = this.playlist.find(t => t.fileUrl === fileUrl) || this.uploadedTracks.find(t => t.fileUrl === fileUrl);
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
    if (this.isPlaying) {
      this.playerService.pause(); 
    } else {
      this.playerService.resume(); 
    }
  }

  openFullPlayer() {
    const card = document.querySelector('ion-card');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async addToPlaylist(track: Track) {
    const exists = this.playlist.some(t => t.fileUrl === track.fileUrl);
    if (!exists) {
      this.playlist = [track, ...this.playlist];
      await this.storageService.setPlaylists(this.playlist); 
    }
  }

  deleteFromPlaylist(index: number) {
    try {
      
      this.playlist.splice(index, 1);
     
      this.storageService.setPlaylists(this.playlist);

      console.log('Track removed from playlist:', this.playlist);
    } catch (error) {
      console.error('Error removing track from playlist:', error);
    }
  }

  togglePlaylistView() {
    this.showPlaylist = !this.showPlaylist;
  }

  triggerFileInput() {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  playPreviousSong() {
    if (!this.currentTrack || this.playlist.length === 0) {
      console.log('No previous song available.');
      return;
    }

    const currentIndex = this.playlist.findIndex(track => track.fileUrl === this.currentTrack?.fileUrl);
    if (currentIndex > 0) {
      const previousTrack = this.playlist[currentIndex - 1];
      console.log('Playing previous track:', previousTrack);
      this.currentTrack = previousTrack;
      this.playAudio(previousTrack.fileUrl);
    } else {
      console.log('No previous song available.');
    }
  }

  playNextSong() {
    if (!this.currentTrack || this.playlist.length === 0) {
      console.log('No next song available.');
      return;
    }

    const currentIndex = this.playlist.findIndex(track => track.fileUrl === this.currentTrack?.fileUrl);
    if (currentIndex < this.playlist.length - 1) {
      const nextTrack = this.playlist[currentIndex + 1];
      console.log('Playing next track:', nextTrack);
      this.currentTrack = nextTrack;
      this.playAudio(nextTrack.fileUrl);
    } else {
      console.log('No next song available.');
    }
  }

  async deleteUploadedTrack(index: number) {
    try {
      const trackToDelete = this.uploadedTracks[index];
      this.uploadedTracks.splice(index, 1);

      await this.storageService.setUploadedTracks(this.uploadedTracks);
      console.log('Track deleted from uploadedTracks:', trackToDelete);
      this.playlist = this.playlist.filter(track => track.fileUrl !== trackToDelete.fileUrl);
      await this.storageService.setPlaylists(this.playlist);

      console.log('Track removed from playlist if it existed:', trackToDelete);
    } catch (error) {
      console.error('Error deleting track:', error);
    }
  }
}
