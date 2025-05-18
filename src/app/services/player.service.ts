// Path: src/app/services/player.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Media, MediaObject } from '@awesome-cordova-plugins/media/ngx';
import { Platform } from '@ionic/angular';
import { Howl } from 'howler';
import { App } from '@capacitor/app';
import { Track } from '../models/track.model';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private mediaObject: MediaObject | null = null;
  private howlerInstance: Howl | null = null;
  currentTrack$ = new BehaviorSubject<Track | null>(null);
  isPlaying$ = new BehaviorSubject<boolean>(false);

  constructor(private media: Media, private platform: Platform) {
    this.setupAppListeners();
  }

  private setupAppListeners() {
    App.addListener('pause', () => this.pause());

    if (this.platform.is('android')) {
      App.addListener('backButton', () => {
        if (this.isPlaying$.value) {
          this.pause();
        } else {
          App.exitApp();
        }
      });
    }
  }

  play(track: Track) {
    this.stop();

    if (!track.fileUrl) {
      console.error('No playable source for track', track);
      return;
    }

    if (this.platform.is('cordova')) {
      this.mediaObject = this.media.create(track.fileUrl);
      this.mediaObject.play();
    } else {
      this.howlerInstance = new Howl({
        src: [track.fileUrl],
        html5: true,
        onplay: () => this.isPlaying$.next(true),
        onend: () => this.isPlaying$.next(false),
        onpause: () => this.isPlaying$.next(false),
        onstop: () => this.isPlaying$.next(false),
      });
      this.howlerInstance.play();
    }

    this.currentTrack$.next(track);
    this.isPlaying$.next(true);
  }

  pause() {
    if (this.howlerInstance) {
      this.howlerInstance.pause(); // Pause playback
      this.isPlaying$.next(false);
    } else if (this.mediaObject) {
      this.mediaObject.pause(); // Pause playback for Cordova/Capacitor
      this.isPlaying$.next(false);
    }
  }

  resume() {
    if (this.howlerInstance) {
      this.howlerInstance.play(); // Resume playback
      this.isPlaying$.next(true);
    } else if (this.mediaObject) {
      this.mediaObject.play(); // Resume playback for Cordova/Capacitor
      this.isPlaying$.next(true);
    }
  }

  stop() {
    if (this.platform.is('cordova')) {
      this.mediaObject?.stop();
      this.mediaObject?.release();
      this.mediaObject = null;
    } else {
      this.howlerInstance?.stop();
      this.howlerInstance = null;
    }
    this.isPlaying$.next(false);
  }

  getCurrentTime(): number {
    if (this.howlerInstance) {
      return this.howlerInstance.seek() as number; // Current time in seconds
    } else if (this.mediaObject) {
      let currentTime = 0;
      this.mediaObject.getCurrentPosition().then(
        (position) => {
          if (position > 0) {
            currentTime = position; // Update current time if valid
          }
        },
        (error) => {
          console.error('Error getting current position:', error);
        }
      );
      return currentTime;
    }
    return 0;
  }

  getTrackDuration(): number {
    if (this.howlerInstance) {
      return this.howlerInstance.duration(); // Total duration in seconds
    } else if (this.mediaObject) {
      return this.mediaObject.getDuration(); // For Cordova/Capacitor
    }
    return 0;
  }
}
