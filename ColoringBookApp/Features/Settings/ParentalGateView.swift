import SwiftUI
import UIKit

/// Apple-compliant kids gate: a holdable instruction that toddlers can't satisfy
/// by accident, but a parent can complete in a couple of seconds.
/// "Press and hold the highlighted number for 2 seconds while tapping it."
struct ParentalGateView: View {
    let onResult: (Bool) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var target = (1...9).randomElement() ?? 5
    @State private var holdProgress: Double = 0
    @State private var isHolding = false
    @State private var holdTimer: Timer?

    var body: some View {
        VStack(spacing: Tokens.Spacing.xl) {
            Spacer()
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 80))
                .foregroundStyle(Color(hex: 0x5856D6))
            Text("Grown-ups only!")
                .font(.system(size: Tokens.FontSize.display, weight: .heavy, design: .rounded))
            Text("Press and hold the **\(target)** for 2 seconds.")
                .font(.system(size: Tokens.FontSize.body, weight: .medium, design: .rounded))
                .multilineTextAlignment(.center)
                .padding(.horizontal, Tokens.Spacing.xl)

            HStack(spacing: Tokens.Spacing.md) {
                ForEach(1...9, id: \.self) { n in
                    Button { } label: {
                        ZStack {
                            Circle()
                                .fill(n == target ? Color(hex: 0x5856D6) : Color.gray.opacity(0.15))
                            Text("\(n)")
                                .font(.system(size: 32, weight: .heavy, design: .rounded))
                                .foregroundStyle(n == target ? .white : .primary)
                            if n == target && isHolding {
                                Circle()
                                    .trim(from: 0, to: holdProgress)
                                    .stroke(Color(hex: 0x34C759), lineWidth: 6)
                                    .rotationEffect(.degrees(-90))
                            }
                        }
                        .frame(width: 70, height: 70)
                    }
                    .buttonStyle(.plain)
                    .simultaneousGesture(
                        n == target ?
                        DragGesture(minimumDistance: 0)
                            .onChanged { _ in startHold() }
                            .onEnded { _ in cancelHold() }
                        : nil
                    )
                }
            }

            Spacer()
            Button("Cancel") {
                onResult(false)
                dismiss()
            }
            .font(.system(size: Tokens.FontSize.body, weight: .semibold, design: .rounded))
            .padding(.bottom, Tokens.Spacing.xl)
        }
        .padding()
    }

    private func startHold() {
        guard !isHolding else { return }
        isHolding = true
        holdProgress = 0
        holdTimer?.invalidate()
        let totalDuration: Double = 2.0
        let step: Double = 1.0 / 60.0
        holdTimer = Timer.scheduledTimer(withTimeInterval: step, repeats: true) { t in
            holdProgress += step / totalDuration
            if holdProgress >= 1 {
                t.invalidate()
                isHolding = false
                onResult(true)
                dismiss()
            }
        }
    }

    private func cancelHold() {
        holdTimer?.invalidate()
        isHolding = false
        holdProgress = 0
    }
}

/// Entry point for triggering the gate from anywhere in the app.
enum ParentalGate {
    static func run(_ completion: @escaping (Bool) -> Void) {
        DispatchQueue.main.async {
            guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let root = scene.keyWindow?.rootViewController?.topPresented() else {
                completion(false)
                return
            }
            let host = UIHostingController(rootView: ParentalGateView { ok in
                root.dismiss(animated: true) { completion(ok) }
            })
            host.modalPresentationStyle = .formSheet
            root.present(host, animated: true)
        }
    }
}

private extension UIWindowScene {
    var keyWindow: UIWindow? { windows.first(where: { $0.isKeyWindow }) ?? windows.first }
}

private extension UIViewController {
    func topPresented() -> UIViewController {
        var top: UIViewController = self
        while let presented = top.presentedViewController { top = presented }
        return top
    }
}
