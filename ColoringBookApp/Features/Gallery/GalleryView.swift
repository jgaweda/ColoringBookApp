import SwiftUI
import SwiftData

struct GalleryView: View {
    @Query(sort: [SortDescriptor(\FinishedPiece.createdAt, order: .reverse)])
    private var pieces: [FinishedPiece]
    @Environment(\.modelContext) private var modelContext

    private let columns = [
        GridItem(.adaptive(minimum: 220, maximum: 280), spacing: Tokens.Spacing.lg)
    ]

    var body: some View {
        ScrollView {
            if pieces.isEmpty {
                emptyState
            } else {
                LazyVGrid(columns: columns, spacing: Tokens.Spacing.lg) {
                    ForEach(pieces) { piece in
                        GalleryItemView(piece: piece, onDelete: { delete(piece) })
                    }
                }
                .padding(Tokens.Spacing.lg)
            }
        }
        .navigationTitle("My Gallery")
        .background(Color(hex: 0xFFF8E1).ignoresSafeArea())
    }

    private var emptyState: some View {
        VStack(spacing: Tokens.Spacing.md) {
            Image(systemName: "photo.stack")
                .font(.system(size: 80))
                .foregroundStyle(Color(hex: 0x5856D6).opacity(0.6))
            Text("Nothing here yet")
                .font(.system(size: Tokens.FontSize.title, weight: .heavy, design: .rounded))
            Text("Color a page and tap the green check to save it here.")
                .font(.system(size: Tokens.FontSize.body, weight: .medium, design: .rounded))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Tokens.Spacing.xl)
        }
        .padding(.top, 80)
    }

    private func delete(_ piece: FinishedPiece) {
        ParentalGate.run { ok in
            guard ok else { return }
            modelContext.delete(piece)
            try? modelContext.save()
            FinishedPieceStore.shared.deleteImage(piece: piece)
        }
    }
}

struct GalleryItemView: View {
    let piece: FinishedPiece
    let onDelete: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Color.white
                if let img = FinishedPieceStore.shared.loadImage(piece: piece) {
                    Image(uiImage: img).resizable().scaledToFit().padding(8)
                } else {
                    Image(systemName: "photo")
                        .font(.system(size: 48))
                        .foregroundStyle(.secondary)
                }
            }
            .aspectRatio(1, contentMode: .fit)
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(piece.pageTitle)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                    Text(piece.categoryTitle)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button(action: onDelete) {
                    Image(systemName: "trash.fill")
                        .foregroundStyle(Color(hex: 0xFF3B30))
                        .padding(8)
                }
                .accessibilityLabel("Delete \(piece.pageTitle)")
            }
            .padding(Tokens.Spacing.sm)
            .background(.white)
        }
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.card))
        .shadow(color: .black.opacity(0.1), radius: 6, y: 3)
    }
}
