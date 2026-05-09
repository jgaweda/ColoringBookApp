import SwiftUI

enum Route: Hashable {
    case category(Category)
    case canvas(Category, ColoringPage)
    case gallery
    case settings
}

@MainActor
final class Router: ObservableObject {
    @Published var path = NavigationPath()

    func push(_ route: Route) { path.append(route) }
    func popToRoot() { path = NavigationPath() }
}

struct AppRouter: View {
    @StateObject private var router = Router()
    @StateObject private var categories = CategoryStore()

    var body: some View {
        NavigationStack(path: $router.path) {
            HomeView()
                .navigationDestination(for: Route.self) { route in
                    switch route {
                    case .category(let category):
                        PagePickerView(category: category)
                    case .canvas(let category, let page):
                        CanvasView(category: category, page: page)
                    case .gallery:
                        GalleryView()
                    case .settings:
                        SettingsView()
                    }
                }
        }
        .environmentObject(router)
        .environmentObject(categories)
        .task { await categories.load() }
    }
}
