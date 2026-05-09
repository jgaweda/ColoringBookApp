import Foundation
import UIKit
import PencilKit

struct CanvasSnapshot: Codable {
    let pageId: String
    let paintPixels: [UInt32]
    let paintWidth: Int
    let paintHeight: Int
    let pkDrawingData: Data
    let stickers: [StoredSticker]

    init(pageId: String, paintPixels: [UInt32], paintWidth: Int, paintHeight: Int, pkDrawingData: Data, stickers: [StickerInstance]) {
        self.pageId = pageId
        self.paintPixels = paintPixels
        self.paintWidth = paintWidth
        self.paintHeight = paintHeight
        self.pkDrawingData = pkDrawingData
        self.stickers = stickers.map(StoredSticker.init)
    }

    var stickerInstances: [StickerInstance] {
        stickers.map(\.instance)
    }
}

struct StoredSticker: Codable {
    let id: UUID
    let asset: String
    let centerX: Double
    let centerY: Double
    let scale: Double
    let rotationRadians: Double

    init(_ s: StickerInstance) {
        self.id = s.id
        self.asset = s.asset
        self.centerX = Double(s.transform.center.x)
        self.centerY = Double(s.transform.center.y)
        self.scale = Double(s.transform.scale)
        self.rotationRadians = s.transform.rotation.radians
    }

    var instance: StickerInstance {
        StickerInstance(
            id: id,
            asset: asset,
            transform: StickerTransform(
                center: CGPoint(x: centerX, y: centerY),
                scale: CGFloat(scale),
                rotation: .radians(rotationRadians)
            )
        )
    }
}

extension CanvasSnapshot {
    var paintInstances: [StickerInstance] { stickerInstances }
}

/// Debounced disk-backed autosaver. One file per page id.
final class Autosaver {
    private let pageId: String
    private let queue = DispatchQueue(label: "Autosaver.\(UUID().uuidString)", qos: .utility)
    private var pendingSnapshot: CanvasSnapshot?
    private var debounceWorkItem: DispatchWorkItem?
    private let debounceInterval: TimeInterval = 2.0

    init(pageId: String) {
        self.pageId = pageId
    }

    func schedule(snapshot: CanvasSnapshot) {
        guard AppSettings.shared.autosaveEnabled else { return }
        queue.async { [weak self] in
            self?.pendingSnapshot = snapshot
            self?.debounceWorkItem?.cancel()
            let work = DispatchWorkItem { [weak self] in self?.flush() }
            self?.debounceWorkItem = work
            self?.queue.asyncAfter(deadline: .now() + (self?.debounceInterval ?? 2), execute: work)
        }
    }

    private func flush() {
        guard let snap = pendingSnapshot else { return }
        pendingSnapshot = nil
        do {
            let url = Self.snapshotURL(pageId: snap.pageId)
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            let data = try JSONEncoder().encode(snap)
            try data.write(to: url, options: [.atomic])
        } catch { /* swallow; autosave is best-effort */ }
    }

    func load() async -> CanvasSnapshot? {
        await withCheckedContinuation { cont in
            queue.async { [weak self] in
                guard let self else { cont.resume(returning: nil); return }
                let url = Self.snapshotURL(pageId: self.pageId)
                guard let data = try? Data(contentsOf: url),
                      let snap = try? JSONDecoder().decode(CanvasSnapshot.self, from: data)
                else { cont.resume(returning: nil); return }
                cont.resume(returning: snap)
            }
        }
    }

    static func snapshotURL(pageId: String) -> URL {
        let docs = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return docs.appendingPathComponent("autosaves").appendingPathComponent("\(pageId).json")
    }
}
