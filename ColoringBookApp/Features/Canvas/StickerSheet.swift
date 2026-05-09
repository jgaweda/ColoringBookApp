import SwiftUI

struct StickerCatalog {
    static let stickers: [String] = [
        "sticker_star", "sticker_heart", "sticker_smile",
        "sticker_glitter", "sticker_rainbow", "sticker_crown",
        "sticker_flower", "sticker_cloud", "sticker_lightning",
        "sticker_balloon", "sticker_cookie", "sticker_paw"
    ]
}

struct StickerTransform: Hashable {
    var center: CGPoint
    var scale: CGFloat
    var rotation: Angle

    static let identity = StickerTransform(center: .init(x: 0.5, y: 0.5), scale: 1, rotation: .zero)
}

struct StickerInstance: Identifiable, Hashable {
    let id: UUID
    let asset: String
    var transform: StickerTransform
}

struct StickerSheet: View {
    let onPick: (String) -> Void
    @Binding var isPresented: Bool

    private let columns = [GridItem(.adaptive(minimum: 90, maximum: 110), spacing: 12)]

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(StickerCatalog.stickers, id: \.self) { name in
                        Button {
                            onPick(name)
                            isPresented = false
                        } label: {
                            ZStack {
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color(hex: 0xFFF8E1))
                                Image(name)
                                    .resizable()
                                    .scaledToFit()
                                    .padding(8)
                                    .overlay {
                                        if UIImage(named: name) == nil {
                                            Image(systemName: "sparkles")
                                                .font(.system(size: 36))
                                                .foregroundStyle(Color(hex: 0xFFCC00))
                                        }
                                    }
                            }
                            .frame(height: 90)
                        }
                        .accessibilityLabel(name.replacingOccurrences(of: "sticker_", with: ""))
                    }
                }
                .padding()
            }
            .navigationTitle("Stickers")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { isPresented = false }
                        .font(.system(size: 18, weight: .bold))
                }
            }
        }
    }
}
