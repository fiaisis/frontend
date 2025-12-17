declare module 'utif' {
  export type IFD = {
    width: number;
    height: number;
    data?: Uint8Array;
  };

  export function decode(buffer: ArrayBuffer): IFD[];
  export function decodeImage(buffer: ArrayBuffer, ifd: IFD): void;
  export function toRGBA8(ifd: IFD): Uint8Array;
}
