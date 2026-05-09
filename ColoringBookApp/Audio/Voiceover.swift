import AVFoundation
import Foundation

@MainActor
final class Voiceover {
    static let shared = Voiceover()
    private let synth = AVSpeechSynthesizer()
    private var lastSpoken: (text: String, at: Date)?

    private init() {}

    func speakColor(_ name: String) {
        guard AppSettings.shared.voiceoverEnabled else { return }
        speak(name)
    }

    func speakCategory(_ name: String) {
        guard AppSettings.shared.voiceoverEnabled else { return }
        speak(name)
    }

    private func speak(_ text: String) {
        // Suppress dupes within 0.6s to avoid stuttering on rapid taps.
        if let last = lastSpoken, last.text == text, Date().timeIntervalSince(last.at) < 0.6 { return }
        lastSpoken = (text, Date())
        if synth.isSpeaking { synth.stopSpeaking(at: .immediate) }
        let u = AVSpeechUtterance(string: text)
        u.voice = AVSpeechSynthesisVoice(language: Locale.current.language.languageCode?.identifier == "es" ? "es-US" : "en-US")
        u.rate = 0.45
        u.pitchMultiplier = 1.15
        synth.speak(u)
    }
}
