/** Minimal typings for the vanilla Pannellum build we load on demand. */

interface PannellumViewer {
  destroy(): void;
  loadScene(sceneId: string): void;
  toggleFullscreen(): void;
  getScene(): string;
  on(event: "load" | "scenechange", handler: () => void): void;
}

interface PannellumGlobal {
  viewer(container: HTMLElement, config: Record<string, unknown>): PannellumViewer;
}

interface Window {
  pannellum: PannellumGlobal;
}

declare module "pannellum/build/pannellum.js";
