import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Media, MediaObject } from '@awesome-cordova-plugins/media/ngx';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private mediaObject: MediaObject | null = null;
  currentTrack$ = new BehaviorSubject<any>(null);
  isPlaying$ = new BehaviorSubject<boolean>(false);
  playlist: any[] = [];

  constructor(private media: Media) {}

  play(track: any) {
    this.stop();
    this.currentTrack$.next(track);
    
    // For local files
    if (track.isLocal && track.localPath) {
      this.mediaObject = this.media.create(track.localPath);
    } 
    // For Deezer streamed preview
    else if (track.preview) {
      this.mediaObject = this.media.create(track.preview);
    } 
    else {
      console.warn('No playable media source found for track:', track);
      return;
    }

    this.mediaObject.play();
    this.isPlaying$.next(true);
  }

  pause() {
    if (this.mediaObject) {
      this.mediaObject.pause();
      this.isPlaying$.next(false);
    }
  }

  stop() {
    if (this.mediaObject) {
      this.mediaObject.stop();
      this.mediaObject.release();
      this.mediaObject = null;
      this.isPlaying$.next(false);
    }
  }

  addToPlaylist(track: any) {
    this.playlist.push(track);
  }

  getPlaylist() {
    return this.playlist;
  }
}
