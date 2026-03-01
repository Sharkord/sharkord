// Patch canvas getContext to add willReadFrequently for 2d contexts.
// Silences: "Canvas2D: Multiple readback operations using getImageData
// are faster with the willReadFrequently attribute set to true."
// Caused by is-emoji-supported used in @tiptap/extension-emoji.
const orig = HTMLCanvasElement.prototype.getContext;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
HTMLCanvasElement.prototype.getContext = function (type: string, attrs?: any) {
  if (type === '2d') {
    attrs = { ...attrs, willReadFrequently: true };
  }
  return orig.call(this, type, attrs);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;
