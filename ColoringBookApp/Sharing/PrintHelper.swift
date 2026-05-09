import UIKit

enum PrintHelper {
    /// AirPrint a finished page. Must only be called after the parental gate succeeds.
    static func print(image: UIImage, jobName: String) {
        let info = UIPrintInfo(dictionary: nil)
        info.outputType = .photo
        info.jobName = jobName

        let controller = UIPrintInteractionController.shared
        controller.printInfo = info
        controller.printingItem = image
        controller.present(animated: true) { _, _, _ in }
    }
}
