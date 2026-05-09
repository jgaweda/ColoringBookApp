import SwiftUI

struct PagePickerView: View {
    let category: Category
    @EnvironmentObject var router: Router

    private let columns = [
        GridItem(.adaptive(minimum: 200, maximum: 260), spacing: Tokens.Spacing.lg)
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Tokens.Spacing.lg) {
                Text(category.subtitle)
                    .font(.system(size: Tokens.FontSize.body, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, Tokens.Spacing.xl)

                LazyVGrid(columns: columns, spacing: Tokens.Spacing.lg) {
                    ForEach(category.pages) { page in
                        Button {
                            router.push(.canvas(category, page))
                        } label: {
                            VStack(spacing: 0) {
                                ZStack {
                                    Color(hex: UInt32(category.accentHex.dropFirst(), radix: 16) ?? 0xFFE066).opacity(0.25)
                                    if let thumb = page.thumbnail {
                                        Image(thumb).resizable().scaledToFit().padding(Tokens.Spacing.sm)
                                    } else {
                                        Image(systemName: "paintbrush.pointed.fill")
                                            .font(.system(size: 64))
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .aspectRatio(1, contentMode: .fit)
                                Text(page.title)
                                    .font(.system(size: 18, weight: .bold, design: .rounded))
                                    .padding(.vertical, Tokens.Spacing.sm)
                            }
                            .background(.white)
                            .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.card))
                            .shadow(color: .black.opacity(0.1), radius: 6, y: 3)
                        }
                        .accessibilityLabel("Color \(page.title)")
                    }
                }
                .padding(.horizontal, Tokens.Spacing.xl)
            }
            .padding(.vertical, Tokens.Spacing.lg)
        }
        .navigationTitle(category.title)
        .background(Color(hex: 0xFFF8E1).ignoresSafeArea())
    }
}
