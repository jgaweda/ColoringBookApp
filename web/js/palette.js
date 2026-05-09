// Greedy Cookie palette — port of iOS KidColors.swift.

export const PRIMARY = [
  { id: "#FF3B30", name: "Red" },
  { id: "#FF6B6B", name: "Pink" },
  { id: "#FF9500", name: "Orange" },
  { id: "#FFCC00", name: "Yellow" },
  { id: "#FFE066", name: "Banana" },
  { id: "#A8E063", name: "Lime" },
  { id: "#34C759", name: "Green" },
  { id: "#30B97A", name: "Mint" },
  { id: "#5AC8FA", name: "Sky Blue" },
  { id: "#007AFF", name: "Blue" },
  { id: "#0A2A6B", name: "Navy" },
  { id: "#5856D6", name: "Purple" },
  { id: "#AF52DE", name: "Violet" },
  { id: "#FF2D92", name: "Magenta" },
  { id: "#8B4513", name: "Brown" },
  { id: "#D2A679", name: "Tan" },
  { id: "#FFD9B3", name: "Peach" },
  { id: "#FFFFFF", name: "White" },
  { id: "#E0E0E0", name: "Light Gray" },
  { id: "#8E8E93", name: "Gray" },
  { id: "#1C1C1E", name: "Black" },
  { id: "#FFD700", name: "Gold" },
  { id: "#C0C0C0", name: "Silver" },
  { id: "#7FFFD4", name: "Aqua" },
];

export const EXTENDED = [
  { id: "#B22222", name: "Cherry" },
  { id: "#DC143C", name: "Crimson" },
  { id: "#FA8072", name: "Salmon" },
  { id: "#FFB6C1", name: "Bubblegum" },
  { id: "#F08080", name: "Coral" },
  { id: "#FFA07A", name: "Apricot" },
  { id: "#F4A460", name: "Caramel" },
  { id: "#DAA520", name: "Honey" },
  { id: "#9ACD32", name: "Olive" },
  { id: "#228B22", name: "Forest" },
  { id: "#2E8B57", name: "Sea Green" },
  { id: "#20B2AA", name: "Teal" },
  { id: "#87CEEB", name: "Robin" },
  { id: "#4169E1", name: "Royal" },
  { id: "#191970", name: "Midnight" },
  { id: "#9370DB", name: "Lavender" },
  { id: "#DDA0DD", name: "Plum" },
  { id: "#FF1493", name: "Hot Pink" },
  { id: "#A0522D", name: "Sienna" },
  { id: "#5C4033", name: "Cocoa" },
  { id: "#F5DEB3", name: "Wheat" },
  { id: "#F5F5DC", name: "Cream" },
  { id: "#708090", name: "Slate" },
  { id: "#000000", name: "Pure Black" },
];

export const ALL_COLORS = [...PRIMARY, ...EXTENDED];

/** Convert "#RRGGBB" into an [r,g,b,a=255] tuple. */
export function hexToRgba(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
    255,
  ];
}

/** Pack [r,g,b,a] into a Uint32 (little-endian RGBA, the layout used by ImageData). */
export function packRgba(r, g, b, a = 255) {
  return ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
}
