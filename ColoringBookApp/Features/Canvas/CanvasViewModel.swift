import SwiftUI
import PencilKit
import Combine

@MainActor
final class CanvasViewModel: ObservableObject {
    // Inputs
    let category: Category
    let page: ColoringPage

    // Layers
    @Published private(set) var lineArtImage: UIImage
    @Published private(set) var paintImage: UIImage?
    @Published var pkDrawing = PKDrawing()
    @Published var stickers: [StickerInstance] = []

    // Selected color & tool
    @Published var selectedColor: PaletteColor = KidColors.primary[0]
    @Published var tool: CanvasTool = .bucket

    // Undo
    private let undoStack = UndoStack()
    @Published var canUndo = false
    @Published var canRedo = false

    // Internal
    let regionMask: RegionMask
    let paintLayer: PaintLayer
    private var autosaver: Autosaver?
    private var lastPKDrawing = PKDrawing()
    private var cancellables = Set<AnyCancellable>()

    init(category: Category, page: ColoringPage) {
        self.category = category
        self.page = page

        // Resolve line-art and region mask, falling back to placeholders.
        let lineImg = LineArtRenderer.image(named: page.lineArt)
            ?? LineArtRenderer.placeholderLineArt(size: CGSize(width: 1024, height: 1024))
        let maskImg = LineArtRenderer.image(named: page.regionMask)
            ?? LineArtRenderer.placeholderRegionMask(size: CGSize(width: 1024, height: 1024))

        self.lineArtImage = lineImg
        let mask = RegionMask(image: maskImg) ?? RegionMask(image: LineArtRenderer.placeholderRegionMask(size: CGSize(width: 256, height: 256)))!
        self.regionMask = mask
        self.paintLayer = PaintLayer(width: mask.width, height: mask.height)

        self.autosaver = Autosaver(pageId: page.id)
        Task { await restoreFromAutosave() }

        // Whenever the user changes the PencilKit drawing, push an undo action.
        $pkDrawing
            .removeDuplicates()
            .debounce(for: .milliseconds(250), scheduler: RunLoop.main)
            .sink { [weak self] new in
                guard let self else { return }
                if new != self.lastPKDrawing {
                    self.undoStack.push(.brush(previous: self.lastPKDrawing, next: new))
                    self.lastPKDrawing = new
                    self.refreshUndoState()
                    self.scheduleAutosave()
                }
            }
            .store(in: &cancellables)
    }

    // MARK: - Bucket fill

    func handleTap(atNormalized point: CGPoint) {
        guard tool == .bucket || tool == .eraser else { return }
        guard let label = regionMask.regionLabel(atNormalized: point) else {
            AudioEngine.shared.playSFX(.error)
            return
        }
        let indices = regionMask.pixelIndices(forLabel: label)
        let color: UIColor = (tool == .eraser) ? .clear : UIColor(selectedColor.color)
        let prev = paintLayer.fill(indices: indices, with: color)
        undoStack.push(.fill(label: label, indices: indices, previous: prev, newColor: color))
        refreshPaintImage()
        refreshUndoState()
        AudioEngine.shared.playSFX(tool == .eraser ? .erase : .fill)
        scheduleAutosave()
    }

    // MARK: - Stickers

    func addSticker(_ asset: String, at center: CGPoint) {
        let inst = StickerInstance(
            id: UUID(),
            asset: asset,
            transform: StickerTransform(center: center, scale: 1, rotation: .zero)
        )
        stickers.append(inst)
        undoStack.push(.sticker(.add(inst)))
        refreshUndoState()
        AudioEngine.shared.playSFX(.sparkle)
        scheduleAutosave()
    }

    func removeSticker(id: UUID) {
        guard let idx = stickers.firstIndex(where: { $0.id == id }) else { return }
        let removed = stickers.remove(at: idx)
        undoStack.push(.sticker(.remove(removed)))
        refreshUndoState()
        scheduleAutosave()
    }

    func updateSticker(id: UUID, before: StickerTransform, after: StickerTransform) {
        guard let idx = stickers.firstIndex(where: { $0.id == id }) else { return }
        stickers[idx].transform = after
        undoStack.push(.sticker(.transform(id: id, before: before, after: after)))
        refreshUndoState()
        scheduleAutosave()
    }

    // MARK: - Undo / redo

    func undo() {
        guard let action = undoStack.popUndo() else { return }
        apply(action, undo: true)
        refreshUndoState()
        AudioEngine.shared.playSFX(.tap)
    }

    func redo() {
        guard let action = undoStack.popRedo() else { return }
        apply(action, undo: false)
        refreshUndoState()
        AudioEngine.shared.playSFX(.tap)
    }

    private func apply(_ action: CanvasAction, undo: Bool) {
        switch action {
        case .fill(_, let indices, let previous, let newColor):
            if undo {
                paintLayer.restore(indices: indices, previous: previous)
            } else {
                paintLayer.fill(indices: indices, with: newColor)
            }
            refreshPaintImage()
        case .brush(let previous, let next):
            pkDrawing = undo ? previous : next
            lastPKDrawing = pkDrawing
        case .sticker(let op):
            switch op {
            case .add(let inst):
                if undo { stickers.removeAll { $0.id == inst.id } } else { stickers.append(inst) }
            case .remove(let inst):
                if undo { stickers.append(inst) } else { stickers.removeAll { $0.id == inst.id } }
            case .transform(let id, let before, let after):
                if let idx = stickers.firstIndex(where: { $0.id == id }) {
                    stickers[idx].transform = undo ? before : after
                }
            }
        case .clear(let snapshot):
            if undo {
                paintLayer.replacePixels(snapshot.pixels)
            } else {
                paintLayer.clear()
            }
            refreshPaintImage()
        }
    }

    func clearAll() {
        let snap = PaintLayerSnapshot(pixels: paintLayer.pixels)
        paintLayer.clear()
        pkDrawing = PKDrawing()
        stickers.removeAll()
        undoStack.push(.clear(previous: snap))
        refreshPaintImage()
        refreshUndoState()
        scheduleAutosave()
    }

    private func refreshUndoState() {
        canUndo = undoStack.canUndo
        canRedo = undoStack.canRedo
    }

    private func refreshPaintImage() {
        paintImage = paintLayer.makeImage()
    }

    // MARK: - Export

    /// Render the merged page (paint + line art + brush + stickers) to a UIImage.
    func render(size: CGSize) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { ctx in
            // Background
            UIColor.white.setFill()
            ctx.fill(CGRect(origin: .zero, size: size))
            // Paint
            paintImage?.draw(in: CGRect(origin: .zero, size: size))
            // Line art on top
            lineArtImage.draw(in: CGRect(origin: .zero, size: size))
            // Brush strokes
            let brushImage = pkDrawing.image(from: pkDrawing.bounds, scale: UIScreen.main.scale)
            brushImage.draw(in: CGRect(origin: .zero, size: size))
            // Stickers
            for s in stickers {
                guard let img = UIImage(named: s.asset) else { continue }
                let baseSize = CGSize(width: 160, height: 160).applying(CGAffineTransform(scaleX: s.transform.scale, y: s.transform.scale))
                let center = CGPoint(x: s.transform.center.x * size.width, y: s.transform.center.y * size.height)
                let rect = CGRect(
                    x: center.x - baseSize.width / 2,
                    y: center.y - baseSize.height / 2,
                    width: baseSize.width,
                    height: baseSize.height
                )
                img.draw(in: rect)
            }
        }
    }

    // MARK: - Autosave

    private func scheduleAutosave() {
        autosaver?.schedule(snapshot: snapshot())
    }

    private func snapshot() -> CanvasSnapshot {
        CanvasSnapshot(
            pageId: page.id,
            paintPixels: paintLayer.pixels,
            paintWidth: paintLayer.width,
            paintHeight: paintLayer.height,
            pkDrawingData: (try? pkDrawing.dataRepresentation()) ?? Data(),
            stickers: stickers
        )
    }

    private func restoreFromAutosave() async {
        guard let snap = await autosaver?.load() else { return }
        if snap.paintPixels.count == paintLayer.pixels.count {
            paintLayer.replacePixels(snap.paintPixels)
        }
        if !snap.pkDrawingData.isEmpty, let d = try? PKDrawing(data: snap.pkDrawingData) {
            pkDrawing = d
            lastPKDrawing = d
        }
        stickers = snap.stickerInstances
        refreshPaintImage()
    }
}
