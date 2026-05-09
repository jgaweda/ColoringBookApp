import XCTest
import UIKit
import PencilKit
@testable import ColoringBookApp

final class UndoStackTests: XCTestCase {
    func testFillUndoRedo() {
        let stack = UndoStack()
        XCTAssertFalse(stack.canUndo)
        XCTAssertFalse(stack.canRedo)

        let action = CanvasAction.fill(label: 0xAABBCC, indices: [0, 1, 2], previous: [0, 0, 0], newColor: .red)
        stack.push(action)
        XCTAssertTrue(stack.canUndo)
        XCTAssertFalse(stack.canRedo)

        XCTAssertNotNil(stack.popUndo())
        XCTAssertFalse(stack.canUndo)
        XCTAssertTrue(stack.canRedo)

        XCTAssertNotNil(stack.popRedo())
        XCTAssertTrue(stack.canUndo)
    }

    func testPushClearsRedo() {
        let stack = UndoStack()
        stack.push(.brush(previous: PKDrawing(), next: PKDrawing()))
        _ = stack.popUndo()
        XCTAssertTrue(stack.canRedo)
        stack.push(.brush(previous: PKDrawing(), next: PKDrawing()))
        XCTAssertFalse(stack.canRedo, "pushing a new action should clear the redo stack")
    }

    func testMixedHistory() {
        let stack = UndoStack()
        stack.push(.fill(label: 1, indices: [], previous: [], newColor: .red))
        stack.push(.brush(previous: PKDrawing(), next: PKDrawing()))
        stack.push(.sticker(.add(StickerInstance(id: UUID(), asset: "x", transform: .identity))))
        XCTAssertTrue(stack.canUndo)
        for _ in 0..<3 { _ = stack.popUndo() }
        XCTAssertFalse(stack.canUndo)
        XCTAssertTrue(stack.canRedo)
    }
}
