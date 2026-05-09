import UIKit
import Photos

@MainActor
final class PhotoSaver {
    static let shared = PhotoSaver()
    private init() {}

    /// Save the image to the user's Photos library, requesting permission first.
    /// Returns true on success.
    @discardableResult
    func save(_ image: UIImage) async -> Bool {
        let status = await requestAddPermission()
        guard status == .authorized || status == .limited else { return false }
        return await withCheckedContinuation { cont in
            PHPhotoLibrary.shared().performChanges {
                PHAssetChangeRequest.creationRequestForAsset(from: image)
            } completionHandler: { ok, _ in cont.resume(returning: ok) }
        }
    }

    private func requestAddPermission() async -> PHAuthorizationStatus {
        await withCheckedContinuation { cont in
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { cont.resume(returning: $0) }
        }
    }
}
