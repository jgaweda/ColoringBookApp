import SwiftUI
import SwiftData

@main
struct ColoringBookApp: App {
    @StateObject private var audio = AudioEngine.shared
    @StateObject private var settings = AppSettings.shared

    var body: some Scene {
        WindowGroup {
            AppRouter()
                .environmentObject(audio)
                .environmentObject(settings)
                .preferredColorScheme(.light)
                .onAppear {
                    audio.startBackgroundMusicIfEnabled()
                }
        }
        .modelContainer(for: [
            FinishedPiece.self,
            ColoringSession.self,
            CategoryProgress.self
        ])
    }
}
