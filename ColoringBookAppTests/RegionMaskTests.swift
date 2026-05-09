import XCTest
import UIKit
@testable import ColoringBookApp

final class RegionMaskTests: XCTestCase {
    func testRegionLabelLookupAndPixelIndices() {
        let img = LineArtRenderer.placeholderRegionMask(size: CGSize(width: 64, height: 64))
        let mask = RegionMask(image: img)
        XCTAssertNotNil(mask)
        guard let mask else { return }

        // Top-left corner is in the outer "label A" region (red-ish placeholder).
        let outer = mask.regionLabel(atNormalized: CGPoint(x: 0.02, y: 0.02))
        XCTAssertNotNil(outer)

        // Center is in the green-ish inner circle region.
        let inner = mask.regionLabel(atNormalized: CGPoint(x: 0.5, y: 0.5))
        XCTAssertNotNil(inner)
        XCTAssertNotEqual(outer, inner)

        // Pixel-index lookup returns at least 1 pixel for each known label.
        if let label = outer {
            XCTAssertGreaterThan(mask.pixelIndices(forLabel: label).count, 0)
        }
    }

    func testOutOfBoundsReturnsNil() {
        let img = LineArtRenderer.placeholderRegionMask(size: CGSize(width: 32, height: 32))
        let mask = RegionMask(image: img)!
        XCTAssertNil(mask.regionLabel(atNormalized: CGPoint(x: -0.1, y: 0.5)))
        XCTAssertNil(mask.regionLabel(atNormalized: CGPoint(x: 0.5, y: 1.2)))
    }
}
