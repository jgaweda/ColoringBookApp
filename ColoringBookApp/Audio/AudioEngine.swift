import AVFoundation
import Foundation

enum SFX: String, CaseIterable {
    case tap, pop, fill, sparkle, erase, applause, error
    var resource: String { "sfx_\(rawValue)" }
}

@MainActor
final class AudioEngine: ObservableObject {
    static let shared = AudioEngine()

    private var bgPlayer: AVAudioPlayer?
    private var sfxPlayers: [SFX: AVAudioPlayer] = [:]

    private init() {
        configureSession()
        preloadSFX()
    }

    // MARK: - Session

    private func configureSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .ambient,
                mode: .default,
                options: [.mixWithOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            // Audio is non-critical; ignore failures.
        }
    }

    // MARK: - Background music

    func startBackgroundMusicIfEnabled() {
        guard AppSettings.shared.musicEnabled else { return }
        guard let url = Bundle.main.url(forResource: "music_loop", withExtension: "m4a")
            ?? Bundle.main.url(forResource: "music_loop", withExtension: "mp3") else { return }
        do {
            let p = try AVAudioPlayer(contentsOf: url)
            p.numberOfLoops = -1
            p.volume = 0.35
            p.prepareToPlay()
            p.play()
            bgPlayer = p
        } catch { /* ignore */ }
    }

    func stopBackgroundMusic() {
        bgPlayer?.stop()
        bgPlayer = nil
    }

    // MARK: - SFX

    private func preloadSFX() {
        for s in SFX.allCases {
            guard let url = Bundle.main.url(forResource: s.resource, withExtension: "m4a")
                ?? Bundle.main.url(forResource: s.resource, withExtension: "mp3") else { continue }
            if let p = try? AVAudioPlayer(contentsOf: url) {
                p.prepareToPlay()
                p.volume = 0.7
                sfxPlayers[s] = p
            }
        }
    }

    func playSFX(_ s: SFX) {
        guard AppSettings.shared.sfxEnabled else { return }
        if let p = sfxPlayers[s] {
            p.currentTime = 0
            p.play()
        }
    }
}
