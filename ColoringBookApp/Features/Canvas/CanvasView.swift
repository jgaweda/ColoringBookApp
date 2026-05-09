import SwiftUI
import PencilKit

struct CanvasView: View {
    @StateObject private var vm: CanvasViewModel
    @EnvironmentObject var router: Router
    @EnvironmentObject var settings: AppSettings
    @Environment(\.modelContext) private var modelContext
    @State private var showStickerSheet = false
    @State private var showShareSheet = false
    @State private var showSavedToast = false
    @State private var pendingShareImage: UIImage?
    @State private var clearConfirm = false
    @State private var renderSize: CGSize = .init(width: 1024, height: 1024)

    init(category: Category, page: ColoringPage) {
        _vm = StateObject(wrappedValue: CanvasViewModel(category: category, page: page))
    }

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                background
                HStack(spacing: 0) {
                    CanvasToolBar(
                        tool: $vm.tool,
                        activeColor: vm.selectedColor,
                        canUndo: vm.canUndo,
                        canRedo: vm.canRedo,
                        onUndo: vm.undo,
                        onRedo: vm.redo,
                        onShare: handleShare,
                        onSave: handleSave,
                        onClear: { clearConfirm = true }
                    )
                    .padding(Tokens.Spacing.md)

                    CanvasStage(vm: vm, onTap: handleStageTap, onAddSticker: handleAddSticker)
                        .padding(Tokens.Spacing.md)
                        .onAppear { renderSize = proxy.size }
                }

                VStack {
                    Spacer()
                    ColorPaletteBar(selected: $vm.selectedColor) { _ in }
                        .padding(.horizontal, Tokens.Spacing.lg)
                        .padding(.bottom, Tokens.Spacing.lg)
                }

                if showSavedToast {
                    Toast(text: "Saved!")
                        .transition(.scale.combined(with: .opacity))
                }
            }
        }
        .navigationTitle(vm.page.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    if vm.tool == .sticker { showStickerSheet = true }
                } label: {
                    Image(systemName: "sparkles").font(.system(size: 22, weight: .bold))
                }
                .accessibilityLabel("Open stickers")
                .opacity(vm.tool == .sticker ? 1 : 0)
            }
        }
        .sheet(isPresented: $showStickerSheet) {
            StickerSheet(onPick: { asset in
                vm.addSticker(asset, at: CGPoint(x: 0.5, y: 0.5))
            }, isPresented: $showStickerSheet)
        }
        .alert("Clear page?", isPresented: $clearConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Clear", role: .destructive) { vm.clearAll() }
        } message: {
            Text("This will erase your colors, brush strokes, and stickers. You can undo it.")
        }
        .sheet(isPresented: $showShareSheet) {
            if let img = pendingShareImage {
                ShareSheet(items: [img])
            }
        }
    }

    // MARK: - Handlers

    private func handleStageTap(point: CGPoint) {
        switch vm.tool {
        case .bucket, .eraser:
            vm.handleTap(atNormalized: point)
        case .sticker:
            showStickerSheet = true
        case .brush:
            break
        }
    }

    private func handleAddSticker(asset: String, point: CGPoint) {
        vm.addSticker(asset, at: point)
    }

    private func handleSave() {
        let img = vm.render(size: renderSize)
        let ctx = modelContext
        let page = vm.page
        let category = vm.category
        Task {
            await PhotoSaver.shared.save(img)
            await MainActor.run {
                AudioEngine.shared.playSFX(.applause)
                withAnimation { showSavedToast = true }
                FinishedPieceStore.shared.save(image: img, page: page, category: category, modelContext: ctx)
            }
            try? await Task.sleep(for: .seconds(1.5))
            await MainActor.run {
                withAnimation { showSavedToast = false }
            }
        }
    }

    private func handleShare() {
        ParentalGate.run { ok in
            guard ok else { return }
            pendingShareImage = vm.render(size: renderSize)
            showShareSheet = true
        }
    }

    private var background: some View {
        Color(hex: 0xFFF8E1).ignoresSafeArea()
    }
}

// MARK: - Canvas stage (paint + line art + brush + stickers)

private struct CanvasStage: View {
    @ObservedObject var vm: CanvasViewModel
    let onTap: (CGPoint) -> Void
    let onAddSticker: (String, CGPoint) -> Void

    var body: some View {
        GeometryReader { geo in
            ZStack {
                // White paper
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color.white)
                    .shadow(color: .black.opacity(0.1), radius: 10, y: 4)

                // Paint layer (under line art)
                if let pi = vm.paintImage {
                    Image(uiImage: pi)
                        .resizable()
                        .interpolation(.none)
                        .scaledToFit()
                        .clipShape(RoundedRectangle(cornerRadius: 24))
                }

                // Line art on top
                Image(uiImage: vm.lineArtImage)
                    .resizable()
                    .scaledToFit()
                    .clipShape(RoundedRectangle(cornerRadius: 24))

                // Brush strokes overlay
                BrushOverlay(drawing: $vm.pkDrawing, isActive: vm.tool == .brush, color: UIColor(vm.selectedColor.color))
                    .clipShape(RoundedRectangle(cornerRadius: 24))

                // Sticker layer
                StickerLayer(
                    stickers: $vm.stickers,
                    onMove: { id, before, after in vm.updateSticker(id: id, before: before, after: after) },
                    onRemove: { id in vm.removeSticker(id: id) }
                )
                .clipShape(RoundedRectangle(cornerRadius: 24))
            }
            .contentShape(RoundedRectangle(cornerRadius: 24))
            .gesture(
                vm.tool == .brush ? nil :
                DragGesture(minimumDistance: 0).onEnded { v in
                    let nx = v.location.x / geo.size.width
                    let ny = v.location.y / geo.size.height
                    onTap(CGPoint(x: nx, y: ny))
                }
            )
        }
    }
}

// MARK: - PencilKit overlay

private struct BrushOverlay: UIViewRepresentable {
    @Binding var drawing: PKDrawing
    let isActive: Bool
    let color: UIColor

    func makeUIView(context: Context) -> PKCanvasView {
        let v = PKCanvasView()
        v.drawingPolicy = .anyInput
        v.backgroundColor = .clear
        v.isOpaque = false
        v.delegate = context.coordinator
        v.drawing = drawing
        v.tool = PKInkingTool(.pen, color: color, width: 18)
        return v
    }

    func updateUIView(_ uiView: PKCanvasView, context: Context) {
        uiView.isUserInteractionEnabled = isActive
        uiView.tool = PKInkingTool(.pen, color: color, width: 18)
        if uiView.drawing != drawing { uiView.drawing = drawing }
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, PKCanvasViewDelegate {
        let parent: BrushOverlay
        init(_ parent: BrushOverlay) { self.parent = parent }
        func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
            parent.drawing = canvasView.drawing
        }
    }
}

// MARK: - Sticker layer

private struct StickerLayer: View {
    @Binding var stickers: [StickerInstance]
    let onMove: (UUID, StickerTransform, StickerTransform) -> Void
    let onRemove: (UUID) -> Void

    var body: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(stickers) { s in
                    StickerView(
                        sticker: s,
                        size: geo.size,
                        onMove: { before, after in onMove(s.id, before, after) },
                        onRemove: { onRemove(s.id) }
                    )
                }
            }
        }
    }
}

private struct StickerView: View {
    let sticker: StickerInstance
    let size: CGSize
    let onMove: (StickerTransform, StickerTransform) -> Void
    let onRemove: () -> Void
    @GestureState private var dragOffset: CGSize = .zero
    @State private var initialTransform: StickerTransform?

    var body: some View {
        let baseDim: CGFloat = 160
        let center = CGPoint(
            x: sticker.transform.center.x * size.width,
            y: sticker.transform.center.y * size.height
        )
        Group {
            if let img = UIImage(named: sticker.asset) {
                Image(uiImage: img)
                    .resizable()
                    .scaledToFit()
            } else {
                Image(systemName: "sparkles")
                    .resizable().scaledToFit()
                    .foregroundStyle(Color(hex: 0xFFD700))
            }
        }
        .frame(width: baseDim * sticker.transform.scale, height: baseDim * sticker.transform.scale)
        .rotationEffect(sticker.transform.rotation)
        .position(x: center.x + dragOffset.width, y: center.y + dragOffset.height)
        .gesture(
            DragGesture()
                .updating($dragOffset) { v, st, _ in st = v.translation }
                .onChanged { _ in if initialTransform == nil { initialTransform = sticker.transform } }
                .onEnded { v in
                    let before = initialTransform ?? sticker.transform
                    var after = before
                    after.center.x += v.translation.width / size.width
                    after.center.y += v.translation.height / size.height
                    onMove(before, after)
                    initialTransform = nil
                }
        )
        .onLongPressGesture { onRemove() }
    }
}

// MARK: - Toast

private struct Toast: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 28, weight: .heavy, design: .rounded))
            .foregroundStyle(.white)
            .padding(.horizontal, 32).padding(.vertical, 18)
            .background(Color(hex: 0x34C759), in: Capsule())
            .shadow(color: .black.opacity(0.15), radius: 8, y: 3)
    }
}
