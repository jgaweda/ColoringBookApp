import SwiftUI
import SwiftData

@MainActor
final class AppSettings: ObservableObject {
    static let shared = AppSettings()

    @AppStorage("musicEnabled") var musicEnabled: Bool = true
    @AppStorage("sfxEnabled") var sfxEnabled: Bool = true
    @AppStorage("voiceoverEnabled") var voiceoverEnabled: Bool = true
    @AppStorage("colorBlindPalette") var colorBlindPalette: Bool = false
    @AppStorage("autosaveEnabled") var autosaveEnabled: Bool = true
}

struct SettingsView: View {
    @EnvironmentObject var settings: AppSettings
    @Environment(\.modelContext) private var modelContext
    @State private var didUnlock = false
    @State private var showClearConfirm = false

    var body: some View {
        Group {
            if didUnlock {
                form
            } else {
                lockedScreen
            }
        }
        .navigationTitle("Settings")
        .background(Color(hex: 0xFFF8E1).ignoresSafeArea())
    }

    private var lockedScreen: some View {
        VStack(spacing: Tokens.Spacing.lg) {
            Spacer()
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 80))
                .foregroundStyle(Color(hex: 0x5856D6))
            Text("Settings are for grown-ups")
                .font(.system(size: Tokens.FontSize.title, weight: .heavy, design: .rounded))
            Button {
                ParentalGate.run { ok in didUnlock = ok }
            } label: {
                Text("Unlock")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 40).padding(.vertical, 16)
                    .background(Color(hex: 0x5856D6), in: Capsule())
            }
            Spacer()
        }
    }

    private var form: some View {
        Form {
            Section("Audio") {
                Toggle("Background music", isOn: $settings.musicEnabled)
                    .onChange(of: settings.musicEnabled) { _, on in
                        if on { AudioEngine.shared.startBackgroundMusicIfEnabled() }
                        else { AudioEngine.shared.stopBackgroundMusic() }
                    }
                Toggle("Sound effects", isOn: $settings.sfxEnabled)
                Toggle("Voice prompts (color & category names)", isOn: $settings.voiceoverEnabled)
            }
            Section("Drawing") {
                Toggle("Autosave my coloring", isOn: $settings.autosaveEnabled)
                Toggle("Color-blind friendly palette", isOn: $settings.colorBlindPalette)
            }
            Section("Data") {
                Button(role: .destructive) {
                    showClearConfirm = true
                } label: {
                    Label("Delete all saved pages", systemImage: "trash")
                }
            }
            Section("About") {
                LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0")
                Text("Greedy Cookie does not collect any data, show ads, or connect to the internet.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .alert("Delete all saved pages?", isPresented: $showClearConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Delete all", role: .destructive) {
                FinishedPieceStore.shared.deleteAll(modelContext: modelContext)
            }
        }
    }
}
