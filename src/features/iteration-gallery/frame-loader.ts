/** A small decoded-image cache shared by playback and look-ahead loading. */
export class FrameLoader {
  private entries = new Map<string, Promise<HTMLImageElement>>();
  private capacity: number;
  private decode: (url: string) => Promise<HTMLImageElement>;
  constructor(capacity: number, decode = async (url: string) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  }) { this.capacity = capacity; this.decode = decode; }
  load(url: string) {
    let pending = this.entries.get(url);
    if (!pending) {
      pending = this.decode(url).catch(error => { this.entries.delete(url); throw error; });
    }
    this.entries.delete(url);
    this.entries.set(url, pending);
    while (this.entries.size > this.capacity) this.entries.delete(this.entries.keys().next().value!);
    return pending;
  }
}
