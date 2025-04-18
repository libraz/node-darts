/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'bindings' {
  function bindings(opts: string | { bindings: string; [key: string]: any }): any;
  export = bindings;
}
