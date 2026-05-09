import SwiftUI

enum Tokens {
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }

    enum Radius {
        static let card: CGFloat = 28
        static let chip: CGFloat = 16
        static let button: CGFloat = 22
    }

    enum HitTarget {
        static let swatch: CGFloat = 60
        static let tool: CGFloat = 72
        static let categoryCard: CGFloat = 220
    }

    enum FontSize {
        static let display: CGFloat = 44
        static let title: CGFloat = 28
        static let body: CGFloat = 20
        static let caption: CGFloat = 14
    }

    enum Animations {
        static let pop: Animation = .spring(response: 0.32, dampingFraction: 0.55)
        static let fade: Animation = .easeInOut(duration: 0.2)
    }
}
