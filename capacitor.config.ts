import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.musicplayer',
  appName: 'MusicPlayer',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      splashFullScreen: true,
      splashImmersive: true,
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    }
  }
};

export default config;
