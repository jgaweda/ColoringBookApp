import SwiftUI

struct ColorPaletteBar: View {
    @Binding var selected: PaletteColor
    @State private var showExtended = false
    var onPick: (PaletteColor) -> Void

    var body: some View {
        HStack(spacing: Tokens.Spacing.sm) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Tokens.Spacing.sm) {
                    ForEach(KidColors.primary) { c in
                        Swatch(color: c, isSelected: c.id == selected.id) {
                            select(c)
                        }
                    }
                }
                .padding(.horizontal, Tokens.Spacing.md)
            }
            Button {
                showExtended.toggle()
            } label: {
                Image(systemName: showExtended ? "minus.circle.fill" : "plus.circle.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(Color(hex: 0x5856D6))
                    .padding(.trailing, Tokens.Spacing.md)
            }
            .accessibilityLabel(showExtended ? "Hide more colors" : "Show more colors")
        }
        .frame(height: Tokens.HitTarget.swatch + 12)
        .background(.white.opacity(0.92), in: Capsule())
        .shadow(color: .black.opacity(0.08), radius: 6, y: 3)
        .overlay(alignment: .bottom) {
            if showExtended {
                ExtendedPalette(selected: $selected, onPick: { c in
                    select(c)
                })
                .padding(.bottom, 80)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(Tokens.Animations.fade, value: showExtended)
    }

    private func select(_ c: PaletteColor) {
        selected = c
        onPick(c)
        Voiceover.shared.speakColor(c.displayName)
        AudioEngine.shared.playSFX(.pop)
    }
}

private struct Swatch: View {
    let color: PaletteColor
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(color.color)
                    .overlay(Circle().stroke(.white, lineWidth: isSelected ? 4 : 0))
                    .overlay(Circle().stroke(.black.opacity(0.15), lineWidth: 1))
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 22, weight: .heavy))
                        .foregroundStyle(.white)
                        .shadow(color: .black.opacity(0.5), radius: 1)
                }
            }
            .frame(width: Tokens.HitTarget.swatch, height: Tokens.HitTarget.swatch)
            .scaleEffect(isSelected ? 1.1 : 1.0)
            .animation(Tokens.Animations.pop, value: isSelected)
        }
        .accessibilityLabel(color.displayName)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}

private struct ExtendedPalette: View {
    @Binding var selected: PaletteColor
    var onPick: (PaletteColor) -> Void
    private let columns = [GridItem(.adaptive(minimum: 56, maximum: 72), spacing: 10)]

    var body: some View {
        VStack {
            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(KidColors.extended) { c in
                    Button {
                        onPick(c)
                    } label: {
                        Circle()
                            .fill(c.color)
                            .overlay(Circle().stroke(.black.opacity(0.15), lineWidth: 1))
                            .frame(width: 48, height: 48)
                    }
                    .accessibilityLabel(c.displayName)
                }
            }
            .padding()
        }
        .background(.white, in: RoundedRectangle(cornerRadius: Tokens.Radius.card))
        .shadow(color: .black.opacity(0.12), radius: 10, y: 4)
        .padding(.horizontal, Tokens.Spacing.lg)
    }
}
