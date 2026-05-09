import Foundation
import Observation

struct ColoringPage: Codable, Hashable, Identifiable {
    let id: String
    let title: String
    let lineArt: String        // bundle path: "LineArt/heroes/caped_kid.svg"
    let regionMask: String     // "LineArt/heroes/caped_kid.mask.png"
    let thumbnail: String?     // optional thumbnail path
}

struct Category: Codable, Hashable, Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let heroImage: String      // "CategoryHeroes/heroes.png"
    let accentHex: String      // background tint, e.g. "#FFE066"
    let pages: [ColoringPage]
}

struct CategoryManifest: Codable {
    let version: Int
    let categories: [Category]
}

@MainActor
final class CategoryStore: ObservableObject {
    @Published private(set) var manifest: CategoryManifest = .init(version: 0, categories: [])
    @Published private(set) var loadError: String?

    var categories: [Category] { manifest.categories }

    func load() async {
        guard let url = Bundle.main.url(forResource: "categories", withExtension: "json") else {
            loadError = "Missing categories.json"
            return
        }
        do {
            let data = try Data(contentsOf: url)
            manifest = try JSONDecoder().decode(CategoryManifest.self, from: data)
        } catch {
            loadError = "Manifest decode failed: \(error.localizedDescription)"
        }
    }

    func category(id: String) -> Category? { categories.first { $0.id == id } }
}
