import XCTest
@testable import ColoringBookApp

final class AutosaverTests: XCTestCase {
    func testRoundTrip() async throws {
        let pageId = "test_page_\(UUID().uuidString)"
        let saver = Autosaver(pageId: pageId)
        let snap = CanvasSnapshot(
            pageId: pageId,
            paintPixels: [0xFF112233, 0xFF445566],
            paintWidth: 2, paintHeight: 1,
            pkDrawingData: Data([0xDE, 0xAD, 0xBE, 0xEF]),
            stickers: []
        )
        saver.schedule(snapshot: snap)
        try await Task.sleep(for: .milliseconds(2300))
        let loaded = await saver.load()
        XCTAssertNotNil(loaded)
        XCTAssertEqual(loaded?.pageId, pageId)
        XCTAssertEqual(loaded?.paintPixels.count, 2)
        XCTAssertEqual(loaded?.paintWidth, 2)
        XCTAssertEqual(loaded?.pkDrawingData.count, 4)

        // Cleanup
        try? FileManager.default.removeItem(at: Autosaver.snapshotURL(pageId: pageId))
    }
}
