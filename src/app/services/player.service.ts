// src/app/services/player.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Media, MediaObject } from '@awesome-cordova-plugins/media/ngx';
import { Platform } from '@ionic/angular';
import { Howl } from 'howler';
import { App } from '@capacitor/app';
import { Track } from '../models/track.model';
import { Capacitor } from '@capacitor/core';

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

    if (this.platform.is('cordova') || (this.platform.is('android') && Capacitor.isNativePlatform())) {
      let source = track.fileUrl;
      if (!source.startsWith('file://') && source.startsWith('/')) {
        source = 'file://' + source;
      }
      this.mediaObject = this.media.create(source);
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
      this.howlerInstance.pause();
      this.isPlaying$.next(false);
    } else if (this.mediaObject) {
      this.mediaObject.pause();
      this.isPlaying$.next(false);
    }
  }

  resume() {
    if (this.howlerInstance) {
      this.howlerInstance.play();
      this.isPlaying$.next(true);
    } else if (this.mediaObject) {
      this.mediaObject.play();
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
      return this.howlerInstance.seek() as number;
    } else if (this.mediaObject) {
      let currentTime = 0;
      this.mediaObject.getCurrentPosition().then(
        (position) => {
          if (position > 0) {
            currentTime = position;
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
      return this.howlerInstance.duration();
    } else if (this.mediaObject) {
      return this.mediaObject.getDuration();
    }
    return 0;
  }

  seekTo(time: number) {
    if (this.howlerInstance) {
      this.howlerInstance.seek(time);
    } else if (this.mediaObject) {
      this.mediaObject.seekTo(time * 1000);
    }
  }
}