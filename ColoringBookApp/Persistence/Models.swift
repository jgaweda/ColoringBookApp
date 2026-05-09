import Foundation
import SwiftData

@Model
final class FinishedPiece {
    @Attribute(.unique) var id: UUID
    var pageId: String
    var pageTitle: String
    var categoryId: String
    var categoryTitle: String
    var imageRelativePath: String
    var createdAt: Date

    init(
        id: UUID = UUID(),
        pageId: String,
        pageTitle: String,
        categoryId: String,
        categoryTitle: String,
        imageRelativePath: String,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.pageId = pageId
        self.pageTitle = pageTitle
        self.categoryId = categoryId
        self.categoryTitle = categoryTitle
        self.imageRelativePath = imageRelativePath
        self.createdAt = createdAt
    }
}

@Model
final class ColoringSession {
    @Attribute(.unique) var pageId: String
    var snapshotPath: String
    var updatedAt: Date

    init(pageId: String, snapshotPath: String, updatedAt: Date = Date()) {
        self.pageId = pageId
        self.snapshotPath = snapshotPath
        self.updatedAt = updatedAt
    }
}

@Model
final class CategoryProgress {
    @Attribute(.unique) var categoryId: String
    var lastOpenedAt: Date
    var pagesCompleted: Int

    init(categoryId: String, lastOpenedAt: Date = Date(), pagesCompleted: Int = 0) {
        self.categoryId = categoryId
        self.lastOpenedAt = lastOpenedAt
        self.pagesCompleted = pagesCompleted
    }
}
