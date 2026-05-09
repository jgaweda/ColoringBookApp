import XCTest
@testable import ColoringBookApp

final class ManifestTests: XCTestCase {
    func testManifestDecodesAndHasMinimumCategories() throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "categories", withExtension: "json"))
        let data = try Data(contentsOf: url)
        let manifest = try JSONDecoder().decode(CategoryManifest.self, from: data)
        XCTAssertEqual(manifest.version, 1)
        XCTAssertGreaterThanOrEqual(manifest.categories.count, 12, "Need at least 12 categories at launch")
        for cat in manifest.categories {
            XCTAssertFalse(cat.id.isEmpty)
            XCTAssertGreaterThanOrEqual(cat.pages.count, 4, "\(cat.id) should ship with at least 4 pages")
            for page in cat.pages {
                XCTAssertFalse(page.id.isEmpty)
                XCTAssertFalse(page.title.isEmpty)
                XCTAssertFalse(page.lineArt.isEmpty)
                XCTAssertFalse(page.regionMask.isEmpty)
            }
        }
    }

    func testCategoryAccentsAreParseableHex() throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "categories", withExtension: "json"))
        let manifest = try JSONDecoder().decode(CategoryManifest.self, from: try Data(contentsOf: url))
        for cat in manifest.categories {
            XCTAssertTrue(cat.accentHex.hasPrefix("#"), "\(cat.id) accent should start with #")
            let hex = cat.accentHex.dropFirst()
            XCTAssertNotNil(UInt32(hex, radix: 16), "\(cat.id) accent must be hex")
        }
    }
}
