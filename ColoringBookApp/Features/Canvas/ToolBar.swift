import SwiftUI

enum CanvasTool: String, CaseIterable, Identifiable {
    case bucket, brush, sticker, eraser
    var id: String { rawValue }

    var icon: String {
        switch self {
        case .bucket:  "drop.fill"
        case .brush:   "paintbrush.pointed.fill"
        case .sticker: "sparkles"
        case .eraser:  "eraser.fill"
        }
    }
    var label: String {
        switch self {
        case .bucket:  "Fill"
        case .brush:   "Brush"
        case .sticker: "Stickers"
        case .eraser:  "Eraser"
        }
    }
}

struct CanvasToolBar: View {
    @Binding var tool: CanvasTool
    let activeColor: PaletteColor
    let canUndo: Bool
    let canRedo: Bool
    let onUndo: () -> Void
    let onRedo: () -> Void
    let onShare: () -> Void
    let onSave: () -> Void
    let onClear: () -> Void

    var body: some View {
        VStack(spacing: Tokens.Spacing.sm) {
            ForEach(CanvasTool.allCases) { t in
                ToolButton(
                    tool: t,
                    isSelected: tool == t,
                    activeColor: activeColor.color
                ) {
                    tool = t
                    AudioEngine.shared.playSFX(.tap)
                }
            }
            Divider().padding(.vertical, 4)
            IconButton(systemName: "arrow.uturn.backward", label: "Undo", enabled: canUndo, action: onUndo)
            IconButton(systemName: "arrow.uturn.forward", label: "Redo", enabled: canRedo, action: onRedo)
            Divider().padding(.vertical, 4)
            IconButton(systemName: "checkmark.circle.fill", label: "Save", enabled: true, tint: Color(hex: 0x34C759), action: onSave)
            IconButton(systemName: "square.and.arrow.up.fill", label: "Share", enabled: true, action: onShare)
            IconButton(systemName: "trash.fill", label: "Clear", enabled: true, tint: Color(hex: 0xFF3B30), action: onClear)
        }
        .padding(Tokens.Spacing.sm)
        .background(.white.opacity(0.95), in: RoundedRectangle(cornerRadius: Tokens.Radius.card))
        .shadow(color: .black.opacity(0.1), radius: 8, y: 3)
    }
}

private struct ToolButton: View {
    let tool: CanvasTool
    let isSelected: Bool
    let activeColor: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(isSelected ? activeColor : Color.gray.opacity(0.12))
                Image(systemName: tool.icon)
                    .font(.system(size: 30, weight: .bold))
                    .foregroundStyle(isSelected ? .white : .primary)
            }
            .frame(width: Tokens.HitTarget.tool, height: Tokens.HitTarget.tool)
            .scaleEffect(isSelected ? 1.05 : 1.0)
            .animation(Tokens.Animations.pop, value: isSelected)
        }
        .accessibilityLabel(tool.label)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}

private struct IconButton: View {
    let systemName: String
    let label: String
    let enabled: Bool
    var tint: Color = Color(hex: 0x5856D6)
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 26, weight: .bold))
                .foregroundStyle(enabled ? tint : Color.gray.opacity(0.4))
                .frame(width: Tokens.HitTarget.tool, height: 50)
        }
        .disabled(!enabled)
        .accessibilityLabel(label)
    }
}
