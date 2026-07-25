// Global ambient declarations for React and JSX
declare module 'react' {
  export type FC<P = {}> = (props: P) => any;
  export type ReactNode = any;
  export type FormEvent = any;
  export type ChangeEvent<T = any> = any;
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  export function useRef<T>(initialValue?: T): { current: T };
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export function createContext<T>(defaultValue: T): any;
  export function useContext<T>(context: any): T;
  const React: any;
  export default React;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    type Element = any;
  }
}

export {};
