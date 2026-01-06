export enum DialogType {
  Join = 'join',
  Leave = 'leave'
}

export type TDialogBaseProps = {
  close: () => void;
  isOpen: boolean;
};
