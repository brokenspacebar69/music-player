import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
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
  private androidProgressInterval: number | null = null;

  currentTrack$ = new BehaviorSubject<Track | null>(null);
  isPlaying$ = new BehaviorSubject<boolean>(false);
  trackDuration$ = new BehaviorSubject<number>(0);
  currentTime$ = new BehaviorSubject<number>(0);

  private howlerProgressSubscription: Subscription | null = null;

  constructor(private media: Media, private platform: Platform, private zone: NgZone) {
    this.setupAppListeners();
  }

  private setupAppListeners(): void {
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

  play(track: Track): void {
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

      const durationPoll = setInterval(() => {
        const dur = this.mediaObject?.getDuration() || -1;
        if (dur > 0) {
          this.trackDuration$.next(dur);
          clearInterval(durationPoll);
        }
      }, 500);

      this.startAndroidProgressTracking();

      this.isPlaying$.next(true); 

    } else {
      this.howlerInstance = new Howl({
        src: [track.fileUrl],
        html5: true,
        onload: () => {
          this.trackDuration$.next(this.howlerInstance?.duration() || 0);
        },
        onplay: () => this.isPlaying$.next(true),
        onend: () => {
          this.isPlaying$.next(false);
          this.currentTime$.next(0);
          this.trackDuration$.next(0);
        },
        onpause: () => this.isPlaying$.next(false),
        onstop: () => this.isPlaying$.next(false),
      });
      this.howlerInstance.play();

      this.startHowlerProgressTracking();
    }

    this.currentTrack$.next(track);
  }

  private startHowlerProgressTracking(): void {
    this.stopHowlerProgressTracking();
    this.howlerProgressSubscription = interval(500).subscribe(() => {
      if (this.howlerInstance && this.isPlaying$.value) {
        const time = this.howlerInstance.seek() as number;
        this.currentTime$.next(time);
      }
    });
  }

  private stopHowlerProgressTracking(): void {
    this.howlerProgressSubscription?.unsubscribe();
    this.howlerProgressSubscription = null;
  }

  private startAndroidProgressTracking(): void {
    this.stopAndroidProgressTracking();
    if (!this.mediaObject) return;

    this.androidProgressInterval = window.setInterval(() => {
      this.mediaObject?.getCurrentPosition().then(position => {
        if (position >= 0) {
          this.zone.run(() => {
            this.currentTime$.next(position);
            this.isPlaying$.next(true);
          });
        }
      }).catch(err => {
        console.error('Error getting current position:', err);
      });
    }, 500);
  }

  private stopAndroidProgressTracking(): void {
    if (this.androidProgressInterval !== null) {
      clearInterval(this.androidProgressInterval);
      this.androidProgressInterval = null;
    }
  }

  pause(): void {
    if (this.howlerInstance) {
      this.howlerInstance.pause();
      this.isPlaying$.next(false);
    } else if (this.mediaObject) {
      this.mediaObject.pause();
      this.isPlaying$.next(false);
    }
  }

  resume(): void {
    if (this.howlerInstance) {
      this.howlerInstance.play();
      this.isPlaying$.next(true);
    } else if (this.mediaObject) {
      this.mediaObject.play();
      this.isPlaying$.next(true);
    }
  }

  stop(): void {
    if (this.platform.is('cordova')) {
      this.mediaObject?.stop();
      this.mediaObject?.release();
      this.mediaObject = null;
      this.stopAndroidProgressTracking();
    } else {
      this.howlerInstance?.stop();
      this.howlerInstance = null;
      this.stopHowlerProgressTracking();
    }
    this.isPlaying$.next(false);
    this.currentTime$.next(0);
    this.trackDuration$.next(0);
  }

  seekTo(time: number): void {
    if (this.howlerInstance) {
      this.howlerInstance.seek(time);
      this.currentTime$.next(time);
    } else if (this.mediaObject) {
      this.mediaObject.seekTo(time * 1000);
      this.currentTime$.next(time);
    }
  }
}
