/* eslint-disable @typescript-eslint/no-explicit-any */
export type TGenericObject = {
  [key: string]: any;
};

export type WithOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;
