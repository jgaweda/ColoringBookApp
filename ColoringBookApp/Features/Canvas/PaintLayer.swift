import UIKit
import CoreGraphics

/// Bitmap that holds the bucket-fill colors for the current page.
/// Same dimensions as the region mask. Composed under the line-art layer.
final class PaintLayer {
    let width: Int
    let height: Int
    private(set) var pixels: [UInt32]   // BGRA premultiplied

    init(width: Int, height: Int) {
        self.width = width
        self.height = height
        self.pixels = [UInt32](repeating: 0, count: width * height)
    }

    /// Apply a color to every pixel in `indices`.
    /// Returns the previous colors so the operation can be undone.
    @discardableResult
    func fill(indices: [Int], with color: UIColor) -> [UInt32] {
        let packed = pack(color)
        var prev = [UInt32](repeating: 0, count: indices.count)
        for (i, idx) in indices.enumerated() {
            prev[i] = pixels[idx]
            pixels[idx] = packed
        }
        return prev
    }

    /// Restore previously-saved pixel values (for undo).
    func restore(indices: [Int], previous: [UInt32]) {
        for (i, idx) in indices.enumerated() {
            pixels[idx] = previous[i]
        }
    }

    func clear() {
        pixels = [UInt32](repeating: 0, count: width * height)
    }

    /// Replace the entire pixel buffer (used by undo of a Clear and by autosave restore).
    func replacePixels(_ newPixels: [UInt32]) {
        guard newPixels.count == pixels.count else { return }
        pixels = newPixels
    }

    /// Render the current paint layer to a UIImage.
    func makeImage() -> UIImage? {
        let cs = CGColorSpaceCreateDeviceRGB()
        let info = CGImageAlphaInfo.premultipliedFirst.rawValue
            | CGBitmapInfo.byteOrder32Little.rawValue
        var buffer = pixels
        guard let ctx = CGContext(
            data: &buffer,
            width: width, height: height,
            bitsPerComponent: 8, bytesPerRow: width * 4,
            space: cs, bitmapInfo: info
        ), let cg = ctx.makeImage() else { return nil }
        return UIImage(cgImage: cg)
    }

    private func pack(_ color: UIColor) -> UInt32 {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        color.getRed(&r, green: &g, blue: &b, alpha: &a)
        let R = UInt32(round(r * 255)) & 0xFF
        let G = UInt32(round(g * 255)) & 0xFF
        let B = UInt32(round(b * 255)) & 0xFF
        let A = UInt32(round(a * 255)) & 0xFF
        // BGRA byte order, premultiplied
        let pr = (R * A) / 255
        let pg = (G * A) / 255
        let pb = (B * A) / 255
        return (A << 24) | (pr << 16) | (pg << 8) | pb
    }
}
