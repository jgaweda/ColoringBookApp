import CoreGraphics
import UIKit

/// Decoded region label image. Each closed line-art region has a unique RGB color.
/// Tapping a point looks up its region color, then we recolor every pixel sharing
/// that label in the paint layer — O(N) once, then cached.
final class RegionMask {
    let width: Int
    let height: Int
    private let pixels: [UInt32]   // BGRA packed
    private var regionPixelIndex: [UInt32: [Int]] = [:]   // labelColor -> linear pixel indices

    init?(image: UIImage) {
        guard let cg = image.cgImage else { return nil }
        let w = cg.width
        let h = cg.height
        var buffer = [UInt32](repeating: 0, count: w * h)
        let cs = CGColorSpaceCreateDeviceRGB()
        let info = CGImageAlphaInfo.premultipliedFirst.rawValue
            | CGBitmapInfo.byteOrder32Little.rawValue
        guard let ctx = CGContext(
            data: &buffer,
            width: w, height: h,
            bitsPerComponent: 8, bytesPerRow: w * 4,
            space: cs, bitmapInfo: info
        ) else { return nil }
        ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
        self.width = w
        self.height = h
        self.pixels = buffer
    }

    /// Region label (RGB) at the given normalized coordinate (0...1).
    /// Returns nil if outside or on a line-art (black) pixel.
    func regionLabel(atNormalized point: CGPoint) -> UInt32? {
        guard point.x >= 0, point.x <= 1, point.y >= 0, point.y <= 1 else { return nil }
        let x = min(width - 1, max(0, Int(point.x * CGFloat(width))))
        let y = min(height - 1, max(0, Int(point.y * CGFloat(height))))
        let p = pixels[y * width + x]
        // ignore line-art (near-black) and transparent
        let r = (p >> 16) & 0xFF
        let g = (p >> 8) & 0xFF
        let b = p & 0xFF
        let a = (p >> 24) & 0xFF
        if a < 8 { return nil }
        if r < 24 && g < 24 && b < 24 { return nil }
        return (r << 16) | (g << 8) | b
    }

    /// Indices of every pixel with this label, indexed lazily.
    func pixelIndices(forLabel label: UInt32) -> [Int] {
        if let cached = regionPixelIndex[label] { return cached }
        var out: [Int] = []
        out.reserveCapacity(width * height / 32)
        for i in 0..<pixels.count {
            let p = pixels[i]
            let r = (p >> 16) & 0xFF
            let g = (p >> 8)  & 0xFF
            let b = p & 0xFF
            let labeled = (r << 16) | (g << 8) | b
            if labeled == label { out.append(i) }
        }
        regionPixelIndex[label] = out
        return out
    }
}
