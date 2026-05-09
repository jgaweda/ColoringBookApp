import SwiftUI

struct CategoryRow: View {
    let category: Category
    let onSelectPage: (ColoringPage) -> Void
    let onSeeAll: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.sm) {
            HStack {
                Text(category.title)
                    .font(.system(size: Tokens.FontSize.title, weight: .heavy, design: .rounded))
                Spacer()
                Button(action: onSeeAll) {
                    Text("See all")
                        .font(.system(size: Tokens.FontSize.body, weight: .semibold, design: .rounded))
                        .foregroundStyle(Color(hex: 0x5856D6))
                }
                .accessibilityLabel("See all \(category.title)")
            }
            .padding(.horizontal, Tokens.Spacing.xl)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Tokens.Spacing.md) {
                    CategoryHeroCard(category: category, action: onSeeAll)
                    ForEach(category.pages.prefix(8)) { page in
                        PageThumbCard(page: page, accent: category.accentHex) {
                            onSelectPage(page)
                        }
                    }
                }
                .padding(.horizontal, Tokens.Spacing.xl)
            }
        }
    }
}

private struct CategoryHeroCard: View {
    let category: Category
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack(alignment: .bottomLeading) {
                Rectangle()
                    .fill(Color(hex: UInt32(category.accentHex.dropFirst(), radix: 16) ?? 0xFFE066))
                    .overlay(
                        Image(category.heroImage)
                            .resizable()
                            .scaledToFit()
                            .padding(Tokens.Spacing.md)
                    )
                Text(category.title)
                    .font(.system(size: 22, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(Tokens.Spacing.md)
                    .background(.black.opacity(0.35), in: Capsule())
                    .padding(Tokens.Spacing.md)
            }
            .frame(width: 280, height: Tokens.HitTarget.categoryCard)
            .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.card))
            .shadow(color: .black.opacity(0.15), radius: 8, y: 4)
        }
        .accessibilityLabel(category.title)
        .accessibilityHint(category.subtitle)
    }
}

private struct PageThumbCard: View {
    let page: ColoringPage
    let accent: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 0) {
                ZStack {
                    Color(hex: UInt32(accent.dropFirst(), radix: 16) ?? 0xFFE066).opacity(0.25)
                    if let thumb = page.thumbnail {
                        Image(thumb)
                            .resizable()
                            .scaledToFit()
                            .padding(Tokens.Spacing.sm)
                    } else {
                        Image(systemName: "scribble.variable")
                            .font(.system(size: 56))
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(height: 160)
                Text(page.title)
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .padding(Tokens.Spacing.sm)
                    .frame(maxWidth: .infinity)
                    .background(.white)
            }
            .frame(width: 180)
            .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.card))
            .shadow(color: .black.opacity(0.12), radius: 6, y: 3)
        }
        .accessibilityLabel("\(page.title) coloring page")
    }
}
