import SwiftUI

struct HomeView: View {
    @EnvironmentObject var router: Router
    @EnvironmentObject var categories: CategoryStore
    @EnvironmentObject var settings: AppSettings

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Tokens.Spacing.xl) {
                header
                if let error = categories.loadError {
                    Text(error)
                        .foregroundStyle(.red)
                        .padding(.horizontal, Tokens.Spacing.lg)
                }
                ForEach(categories.categories) { category in
                    CategoryRow(category: category) { page in
                        router.push(.canvas(category, page))
                    } onSeeAll: {
                        router.push(.category(category))
                    }
                }
            }
            .padding(.vertical, Tokens.Spacing.lg)
        }
        .background(homeBackground)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .navigationBar)
    }

    private var header: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Greedy Cookie")
                    .font(.system(size: Tokens.FontSize.display, weight: .heavy, design: .rounded))
                Text("Coloring Book")
                    .font(.system(size: Tokens.FontSize.title, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            HomeIconButton(systemName: "photo.stack.fill", label: "Gallery") {
                router.push(.gallery)
            }
            HomeIconButton(systemName: "gearshape.fill", label: "Settings") {
                router.push(.settings)
            }
        }
        .padding(.horizontal, Tokens.Spacing.xl)
    }

    private var homeBackground: some View {
        LinearGradient(
            colors: [Color(hex: 0xFFF8E1), Color(hex: 0xFFE9F4)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
}

private struct HomeIconButton: View {
    let systemName: String
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: Tokens.HitTarget.tool, height: Tokens.HitTarget.tool)
                .background(
                    Circle().fill(Color(hex: 0x5856D6))
                        .shadow(color: .black.opacity(0.15), radius: 6, y: 3)
                )
        }
        .accessibilityLabel(label)
    }
}

#Preview {
    AppRouter()
}
