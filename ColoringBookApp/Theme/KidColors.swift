import SwiftUI

struct PaletteColor: Identifiable, Hashable {
    let id: String
    let displayName: String
    let color: Color
    let pattern: String?

    var hex: String { id }
}

enum KidColors {
    /// 24-swatch primary palette: bright, toddler-friendly, high-contrast.
    static let primary: [PaletteColor] = [
        .init(id: "#FF3B30", displayName: "Red",        color: Color(hex: 0xFF3B30), pattern: "circles"),
        .init(id: "#FF6B6B", displayName: "Pink",       color: Color(hex: 0xFF6B6B), pattern: "hearts"),
        .init(id: "#FF9500", displayName: "Orange",     color: Color(hex: 0xFF9500), pattern: "triangles"),
        .init(id: "#FFCC00", displayName: "Yellow",     color: Color(hex: 0xFFCC00), pattern: "stars"),
        .init(id: "#FFE066", displayName: "Banana",     color: Color(hex: 0xFFE066), pattern: "dots"),
        .init(id: "#A8E063", displayName: "Lime",       color: Color(hex: 0xA8E063), pattern: "squares"),
        .init(id: "#34C759", displayName: "Green",      color: Color(hex: 0x34C759), pattern: "leaves"),
        .init(id: "#30B97A", displayName: "Mint",       color: Color(hex: 0x30B97A), pattern: "waves"),
        .init(id: "#5AC8FA", displayName: "Sky Blue",   color: Color(hex: 0x5AC8FA), pattern: "clouds"),
        .init(id: "#007AFF", displayName: "Blue",       color: Color(hex: 0x007AFF), pattern: "drops"),
        .init(id: "#0A2A6B", displayName: "Navy",       color: Color(hex: 0x0A2A6B), pattern: "bars"),
        .init(id: "#5856D6", displayName: "Purple",     color: Color(hex: 0x5856D6), pattern: "diamonds"),
        .init(id: "#AF52DE", displayName: "Violet",     color: Color(hex: 0xAF52DE), pattern: "moons"),
        .init(id: "#FF2D92", displayName: "Magenta",    color: Color(hex: 0xFF2D92), pattern: "hatch"),
        .init(id: "#8B4513", displayName: "Brown",      color: Color(hex: 0x8B4513), pattern: "wood"),
        .init(id: "#D2A679", displayName: "Tan",        color: Color(hex: 0xD2A679), pattern: "sand"),
        .init(id: "#FFD9B3", displayName: "Peach",      color: Color(hex: 0xFFD9B3), pattern: "ripples"),
        .init(id: "#FFFFFF", displayName: "White",      color: Color(hex: 0xFFFFFF), pattern: "snow"),
        .init(id: "#E0E0E0", displayName: "Light Gray", color: Color(hex: 0xE0E0E0), pattern: "fog"),
        .init(id: "#8E8E93", displayName: "Gray",       color: Color(hex: 0x8E8E93), pattern: "stone"),
        .init(id: "#1C1C1E", displayName: "Black",      color: Color(hex: 0x1C1C1E), pattern: "checker"),
        .init(id: "#FFD700", displayName: "Gold",       color: Color(hex: 0xFFD700), pattern: "sparkle"),
        .init(id: "#C0C0C0", displayName: "Silver",     color: Color(hex: 0xC0C0C0), pattern: "glint"),
        .init(id: "#7FFFD4", displayName: "Aqua",       color: Color(hex: 0x7FFFD4), pattern: "bubbles"),
    ]

    /// Extra 24 swatches revealed by the "+" button.
    static let extended: [PaletteColor] = [
        .init(id: "#B22222", displayName: "Cherry",     color: Color(hex: 0xB22222), pattern: nil),
        .init(id: "#DC143C", displayName: "Crimson",    color: Color(hex: 0xDC143C), pattern: nil),
        .init(id: "#FA8072", displayName: "Salmon",     color: Color(hex: 0xFA8072), pattern: nil),
        .init(id: "#FFB6C1", displayName: "Bubblegum",  color: Color(hex: 0xFFB6C1), pattern: nil),
        .init(id: "#F08080", displayName: "Coral",      color: Color(hex: 0xF08080), pattern: nil),
        .init(id: "#FFA07A", displayName: "Apricot",    color: Color(hex: 0xFFA07A), pattern: nil),
        .init(id: "#F4A460", displayName: "Caramel",    color: Color(hex: 0xF4A460), pattern: nil),
        .init(id: "#DAA520", displayName: "Honey",      color: Color(hex: 0xDAA520), pattern: nil),
        .init(id: "#9ACD32", displayName: "Olive",      color: Color(hex: 0x9ACD32), pattern: nil),
        .init(id: "#228B22", displayName: "Forest",     color: Color(hex: 0x228B22), pattern: nil),
        .init(id: "#2E8B57", displayName: "Sea Green",  color: Color(hex: 0x2E8B57), pattern: nil),
        .init(id: "#20B2AA", displayName: "Teal",       color: Color(hex: 0x20B2AA), pattern: nil),
        .init(id: "#87CEEB", displayName: "Robin",      color: Color(hex: 0x87CEEB), pattern: nil),
        .init(id: "#4169E1", displayName: "Royal",      color: Color(hex: 0x4169E1), pattern: nil),
        .init(id: "#191970", displayName: "Midnight",   color: Color(hex: 0x191970), pattern: nil),
        .init(id: "#9370DB", displayName: "Lavender",   color: Color(hex: 0x9370DB), pattern: nil),
        .init(id: "#DDA0DD", displayName: "Plum",       color: Color(hex: 0xDDA0DD), pattern: nil),
        .init(id: "#FF1493", displayName: "Hot Pink",   color: Color(hex: 0xFF1493), pattern: nil),
        .init(id: "#A0522D", displayName: "Sienna",     color: Color(hex: 0xA0522D), pattern: nil),
        .init(id: "#5C4033", displayName: "Cocoa",      color: Color(hex: 0x5C4033), pattern: nil),
        .init(id: "#F5DEB3", displayName: "Wheat",      color: Color(hex: 0xF5DEB3), pattern: nil),
        .init(id: "#F5F5DC", displayName: "Cream",      color: Color(hex: 0xF5F5DC), pattern: nil),
        .init(id: "#708090", displayName: "Slate",      color: Color(hex: 0x708090), pattern: nil),
        .init(id: "#000000", displayName: "Pure Black", color: Color(hex: 0x000000), pattern: nil),
    ]

    static var all: [PaletteColor] { primary + extended }

    static func find(by hex: String) -> PaletteColor? {
        all.first { $0.id.lowercased() == hex.lowercased() }
    }
}

extension Color {
    init(hex: UInt32, opacity: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >>  8) & 0xFF) / 255.0
        let b = Double( hex        & 0xFF) / 255.0
        self.init(.sRGB, red: r, green: g, blue: b, opacity: opacity)
    }
}
