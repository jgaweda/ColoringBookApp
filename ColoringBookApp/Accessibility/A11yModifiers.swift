import SwiftUI

extension View {
    /// Apply a kid-app-appropriate VoiceOver label and trait combination.
    func kidAccessible(label: String, hint: String? = nil, traits: AccessibilityTraits = []) -> some View {
        self
            .accessibilityElement(children: .combine)
            .accessibilityLabel(label)
            .accessibilityHint(hint ?? "")
            .accessibilityAddTraits(traits)
    }

    /// Force a minimum tappable area suitable for toddlers.
    func toddlerHitTarget(min: CGFloat = 60) -> some View {
        self.frame(minWidth: min, minHeight: min)
            .contentShape(Rectangle())
    }
}
