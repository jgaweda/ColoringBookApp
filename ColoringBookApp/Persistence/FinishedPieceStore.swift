import Foundation
import UIKit
import SwiftData

@MainActor
final class FinishedPieceStore {
    static let shared = FinishedPieceStore()
    private init() {}

    private var directory: URL {
        let docs = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let dir = docs.appendingPathComponent("gallery")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    func save(image: UIImage, page: ColoringPage, category: Category, modelContext: ModelContext) {
        guard let data = image.pngData() else { return }
        let id = UUID()
        let rel = "\(id.uuidString).png"
        let url = directory.appendingPathComponent(rel)
        try? data.write(to: url, options: [.atomic])

        let piece = FinishedPiece(
            id: id,
            pageId: page.id,
            pageTitle: page.title,
            categoryId: category.id,
            categoryTitle: category.title,
            imageRelativePath: rel
        )
        modelContext.insert(piece)
        try? modelContext.save()
    }

    func loadImage(piece: FinishedPiece) -> UIImage? {
        let url = directory.appendingPathComponent(piece.imageRelativePath)
        guard let data = try? Data(contentsOf: url) else { return nil }
        return UIImage(data: data)
    }

    func deleteImage(piece: FinishedPiece) {
        let url = directory.appendingPathComponent(piece.imageRelativePath)
        try? FileManager.default.removeItem(at: url)
    }

    func deleteAll(modelContext: ModelContext) {
        try? FileManager.default.removeItem(at: directory)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let descriptor = FetchDescriptor<FinishedPiece>()
        if let pieces = try? modelContext.fetch(descriptor) {
            for p in pieces { modelContext.delete(p) }
            try? modelContext.save()
        }
    }
}
