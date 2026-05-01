declare module "openseadragon" {
  interface GestureSettings {
    scrollToZoom?: boolean;
    clickToZoom?: boolean;
    dblClickToZoom?: boolean;
    dragToPan?: boolean;
    pinchToZoom?: boolean;
  }

  interface TileSource {
    type: "image";
    url: string;
  }

  interface Options {
    element: HTMLElement;
    prefixUrl?: string;
    tileSources?: TileSource;
    showNavigationControl?: boolean;
    gestureSettingsMouse?: GestureSettings;
    gestureSettingsTouch?: GestureSettings;
    animationTime?: number;
    blendTime?: number;
    springStiffness?: number;
    constrainDuringPan?: boolean;
    visibilityRatio?: number;
    minZoomImageRatio?: number;
    maxZoomPixelRatio?: number;
    zoomPerScroll?: number;
    preserveImageSizeOnResize?: boolean;
  }

  namespace OpenSeadragon {
    interface Viewer {
      open(tileSource: TileSource): void;
      viewport: {
        zoomBy(factor: number): void;
        goHome(): void;
      };
      setFullScreen(fullScreen: boolean): void;
      destroy(): void;
    }
  }

  function OpenSeadragon(options: Options): OpenSeadragon.Viewer;

  export = OpenSeadragon;
}
