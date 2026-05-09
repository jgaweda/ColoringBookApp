import UIKit

/// Resolves line-art images. Currently supports PNGs/SVGs bundled as image assets
/// or as files inside the Content directory. SVG support uses the system SVG
/// rendering on iOS 13+ via UIImage(named:).
enum LineArtRenderer {
    static func image(named bundlePath: String) -> UIImage? {
        // Try asset catalog first (preferred for SVG line art).
        let assetName = (bundlePath as NSString).lastPathComponent
            .replacingOccurrences(of: ".svg", with: "")
            .replacingOccurrences(of: ".png", with: "")
        if let img = UIImage(named: assetName) { return img }

        // Then resolve from the Content folder reference inside the bundle.
        if let url = Bundle.main.url(forResource: bundlePath, withExtension: nil),
           let data = try? Data(contentsOf: url),
           let img = UIImage(data: data) {
            return img
        }
        return nil
    }

    /// Placeholder line art used when an asset is missing — keeps the canvas
    /// usable in development and on first run before art is generated.
    static func placeholderLineArt(size: CGSize) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { ctx in
            UIColor.white.setFill()
            ctx.fill(CGRect(origin: .zero, size: size))
            UIColor.black.setStroke()
            let path = UIBezierPath(
                roundedRect: CGRect(origin: .zero, size: size).insetBy(dx: size.width * 0.1, dy: size.height * 0.1),
                cornerRadius: size.width * 0.1
            )
            path.lineWidth = max(2, size.width * 0.005)
            path.stroke()
            let inner = UIBezierPath(
                ovalIn: CGRect(origin: .zero, size: size).insetBy(dx: size.width * 0.25, dy: size.height * 0.25)
            )
            inner.lineWidth = path.lineWidth
            inner.stroke()
        }
    }

    /// Placeholder region mask paired with `placeholderLineArt`.
    static func placeholderRegionMask(size: CGSize) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { _ in
            // Outer area = label A
            UIColor(red: 1.0, green: 0.5, blue: 0.5, alpha: 1).setFill()
            UIBezierPath(rect: CGRect(origin: .zero, size: size)).fill()
            // Inner ring = label B
            UIColor(red: 0.5, green: 0.7, blue: 1.0, alpha: 1).setFill()
            UIBezierPath(
                roundedRect: CGRect(origin: .zero, size: size).insetBy(dx: size.width * 0.1, dy: size.height * 0.1),
                cornerRadius: size.width * 0.1
            ).fill()
            // Inner circle = label C
            UIColor(red: 0.5, green: 1.0, blue: 0.6, alpha: 1).setFill()
            UIBezierPath(
                ovalIn: CGRect(origin: .zero, size: size).insetBy(dx: size.width * 0.25, dy: size.height * 0.25)
            ).fill()
        }
    }
}
