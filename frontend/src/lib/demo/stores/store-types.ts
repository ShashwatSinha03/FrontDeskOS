export type Listener = () => void;

export abstract class DemoStore {
  protected listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  protected notify(): void {
    this.listeners.forEach(l => l());
  }
}
