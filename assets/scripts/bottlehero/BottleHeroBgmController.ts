import { AudioClip, AudioSource } from 'cc';
import { BottleHeroAudioProvider, BottleHeroBgmProvider, BottleHeroSfxPaths } from './BottleHeroAssetProvider';
import { GameState } from './BottleHeroTypes';

export interface BottleHeroBgmHost {
  getMainBgmSource(): AudioSource;
  getAvatarHomeBgmSource(): AudioSource;
  getBossBgmSource(): AudioSource;
  getGameState(): GameState;
  scheduleOnce(callback: () => void, delay: number): void;
}

export class BottleHeroBgmController implements BottleHeroBgmProvider {
  constructor(
    private readonly audio: BottleHeroAudioProvider,
    private readonly host: BottleHeroBgmHost,
  ) {}

  playMainBgm() {
    const clip = this.audio.getCoreClip('bgm');
    if (!clip) {
      return;
    }
    this.stopAvatarHomeBgm();
    this.stopBossBgm();
    const source = this.host.getMainBgmSource();
    source.stop();
    source.clip = clip;
    source.loop = true;
    source.volume = 0.45;
    source.play();
    this.host.scheduleOnce(() => {
      if (this.host.getGameState() === 'playing' && clip && !source.playing) {
        source.clip = clip;
        source.loop = true;
        source.volume = 0.45;
        source.play();
      }
    }, 0.12);
  }

  stopMainBgm() {
    this.host.getMainBgmSource().stop();
  }

  playAvatarHomeBgm() {
    const clip = this.audio.getSfxClip(BottleHeroSfxPaths.avatarHomeBgm);
    if (!clip) {
      return;
    }
    this.stopBossBgm();
    const source = this.host.getAvatarHomeBgmSource();
    source.stop();
    source.clip = clip;
    source.loop = true;
    source.volume = 0.34;
    source.play();
  }

  stopAvatarHomeBgm() {
    const source = this.host.getAvatarHomeBgmSource();
    if (source.playing) {
      source.stop();
    }
  }

  playBossBgm() {
    const clip = this.audio.getSfxClip(BottleHeroSfxPaths.bossFightingBgm);
    if (!clip) {
      return;
    }
    const source = this.host.getBossBgmSource();
    source.stop();
    source.clip = clip;
    source.loop = true;
    source.volume = 0.42;
    source.play();
  }

  stopBossBgm() {
    const source = this.host.getBossBgmSource();
    if (source.playing) {
      source.stop();
    }
  }

  stopAllBgm() {
    this.stopMainBgm();
    this.stopAvatarHomeBgm();
    this.stopBossBgm();
  }
}
