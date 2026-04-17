/**
 * Fixed Delete Document Method
 *
 * Designer: Harumi-chan (￣▽￣)ﾉ
 * Fix: Delete entire directory to prevent memory leak
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * FIXED: Delete document (complete cleanup)
 *
 * Changes:
 * 1. Delete entire document directory (including source files)
 * 2. Remove from all indexes
 * 3. Remove from registry
 * 4. No leftover files or directories
 */
async deleteDocumentFixed(documentId) {
    const documentsRoot = path.resolve(__dirname, '../../../../相关文档');

    try {
        // Step 1: Get document info before deletion
        const docInfo = await this.registry.getDocument(documentId);
        if (!docInfo) {
            throw new Error(`Document not found: ${documentId}`);
        }

        console.log(`🗑️  Deleting document: ${docInfo.displayName} (${documentId})`);

        // Step 2: Remove from unified index (Single Source of Truth)
        try {
            await unifiedIndexManager.removeDocument(documentId);
            console.log(`  ✓ Removed from unified index`);
        } catch (error) {
            console.log(`  ⚠️  Not in unified index: ${error.message}`);
        }

        // Step 3: Remove from old index (backward compatibility)
        try {
            await this.indexManager.removeDocumentFromIndex(documentId);
            console.log(`  ✓ Removed from old index`);
        } catch (error) {
            // Ignore, old index might not have this document
        }

        // Step 4: Remove from registry
        const document = await this.registry.deleteDocument(documentId);
        console.log(`  ✓ Removed from registry`);

        // Step 5: SIMPLE & DIRECT - Delete entire document directory!
        const docDir = path.join(documentsRoot, document.directory);

        try {
            // Delete everything: source/, extracted/, chunks/, meta.json
            // Just one operation - clean and simple!
            await fs.rm(docDir, { recursive: true, force: true });
            console.log(`  ✓ Deleted entire directory: ${document.directory}`);
            console.log(`  ✨ Complete cleanup - no leftovers!`);
        } catch (error) {
            console.warn(`  ⚠️  Could not delete directory: ${error.message}`);
            console.warn(`  📁 Directory path: ${docDir}`);
        }

        console.log(`✅ Document deleted successfully: ${documentId}`);

        return document;

    } catch (error) {
        console.error(`❌ Failed to delete document ${documentId}:`, error.message);
        throw error;
    }
}

/**
 * Alternative: Clean up all orphan directories
 *
 * Finds and deletes all doc_doc_* directories that are not in registry
 */
async function cleanupAllOrphanDirectories() {
    const documentsRoot = path.resolve(__dirname, '../../../../相关文档');
    const registry = await this.registry.getRegistry();

    // Get all active document IDs
    const activeIds = new Set(
        registry.documents
            .map(d => d.documentId)
            .filter(Boolean)
    );

    try {
        const entries = await fs.readdir(documentsRoot, { withFileTypes: true });
        const orphanDirs = [];

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (!entry.name.startsWith('doc_')) continue;

            // Extract document ID from directory name
            // Format: doc_doc_1234567890_abcdef
            const parts = entry.name.split('_');
            if (parts.length < 3) continue;

            const docId = parts[2];

            // Check if in registry
            if (!activeIds.has(docId)) {
                const fullPath = path.join(documentsRoot, entry.name);
                const stats = await fs.stat(fullPath);

                orphanDirs.push({
                    name: entry.name,
                    path: fullPath,
                    size: stats.size,
                    docId: docId
                });
            }
        }

        if (orphanDirs.length === 0) {
            console.log('✅ No orphan directories found');
            return { cleaned: 0 };
        }

        console.log(`🔍 Found ${orphanDirs.length} orphan directories`);

        let cleanedCount = 0;
        let totalSize = 0;

        for (const dir of orphanDirs) {
            try {
                await fs.rm(dir.path, { recursive: true, force: true });
                cleanedCount++;
                totalSize += dir.size;
                console.log(`  ✓ Deleted: ${dir.name}`);
            } catch (error) {
                console.error(`  ✗ Failed to delete ${dir.name}: ${error.message}`);
            }
        }

        console.log(`✅ Cleanup completed: ${cleanedCount}/${orphanDirs.length} directories`);
        console.log(`💾 Space freed: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

        return { cleaned: cleanedCount, totalSize };

    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        throw error;
    }
}

// Export for use
export { deleteDocumentFixed, cleanupAllOrphanDirectories };
