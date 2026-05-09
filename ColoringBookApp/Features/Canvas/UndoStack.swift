import Foundation
import UIKit
import PencilKit

enum CanvasAction {
    case fill(label: UInt32, indices: [Int], previous: [UInt32], newColor: UIColor)
    case brush(previous: PKDrawing, next: PKDrawing)
    case sticker(StickerOp)
    case clear(previous: PaintLayerSnapshot)
}

struct PaintLayerSnapshot {
    let pixels: [UInt32]
}

enum StickerOp {
    case add(StickerInstance)
    case remove(StickerInstance)
    case transform(id: UUID, before: StickerTransform, after: StickerTransform)
}

final class UndoStack {
    private var undoActions: [CanvasAction] = []
    private var redoActions: [CanvasAction] = []

    var canUndo: Bool { !undoActions.isEmpty }
    var canRedo: Bool { !redoActions.isEmpty }

    func push(_ action: CanvasAction) {
        undoActions.append(action)
        redoActions.removeAll()
    }

    func popUndo() -> CanvasAction? {
        guard let a = undoActions.popLast() else { return nil }
        redoActions.append(a)
        return a
    }

    func popRedo() -> CanvasAction? {
        guard let a = redoActions.popLast() else { return nil }
        undoActions.append(a)
        return a
    }

    func clear() {
        undoActions.removeAll()
        redoActions.removeAll()
    }
}
