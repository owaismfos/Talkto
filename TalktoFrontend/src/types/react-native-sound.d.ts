declare module 'react-native-sound' {
  type SoundCallback = (error?: unknown) => void;

  class Sound {
    static MAIN_BUNDLE: string;
    static setCategory(category: string): void;

    constructor(filename: string, basePath: string, callback?: SoundCallback);

    setNumberOfLoops(value: number): this;
    play(callback?: (success: boolean) => void): void;
    stop(callback?: () => void): void;
    release(): void;
  }

  export default Sound;
}
