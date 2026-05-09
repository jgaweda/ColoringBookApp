// Mixed undo stack covering bucket fills, brush strokes, and stickers.
// Each action carries the data needed to undo and redo without re-rendering
// the whole stage.

export class UndoStack {
  constructor() {
    this.undoActions = [];
    this.redoActions = [];
  }
  get canUndo() { return this.undoActions.length > 0; }
  get canRedo() { return this.redoActions.length > 0; }

  push(action) {
    this.undoActions.push(action);
    this.redoActions.length = 0;
  }
  popUndo() {
    const a = this.undoActions.pop();
    if (a) this.redoActions.push(a);
    return a;
  }
  popRedo() {
    const a = this.redoActions.pop();
    if (a) this.undoActions.push(a);
    return a;
  }
  clear() {
    this.undoActions.length = 0;
    this.redoActions.length = 0;
  }
}

// Action shapes (loosely typed):
// { type: "fill",   indices: Uint32Array, prev: Uint32Array, next: Uint32 }
// { type: "brush",  prev: ImageData,      next: ImageData }
// { type: "sticker-add",    sticker: {...} }
// { type: "sticker-remove", sticker: {...} }
// { type: "sticker-move",   id, before: {x,y,scale,rot}, after: {...} }
// { type: "clear",  prev: Uint32Array, prevBrush: ImageData, prevStickers: [...] }
