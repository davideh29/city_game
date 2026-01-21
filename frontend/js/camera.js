// Crossroads - Camera System

/**
 * Camera class for pan and zoom
 */
class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.zoom = 1.0;
        this.minZoom = 0.1;
        this.maxZoom = 4.0;

        // Map bounds
        this.mapWidth = 2000;
        this.mapHeight = 2000;

        // Pan state
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.panStartCamX = 0;
        this.panStartCamY = 0;
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = screenX - rect.left;
        const canvasY = screenY - rect.top;

        const worldX = (canvasX - this.canvas.width / 2) / this.zoom + this.x;
        const worldY = (canvasY - this.canvas.height / 2) / this.zoom + this.y;

        return new Vec2(worldX, worldY);
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX, worldY) {
        const screenX = (worldX - this.x) * this.zoom + this.canvas.width / 2;
        const screenY = (worldY - this.y) * this.zoom + this.canvas.height / 2;
        return { x: screenX, y: screenY };
    }

    /**
     * Start panning
     */
    startPan(screenX, screenY) {
        this.isPanning = true;
        this.panStartX = screenX;
        this.panStartY = screenY;
        this.panStartCamX = this.x;
        this.panStartCamY = this.y;
    }

    /**
     * Update pan position
     */
    updatePan(screenX, screenY) {
        if (!this.isPanning) return;

        const dx = (screenX - this.panStartX) / this.zoom;
        const dy = (screenY - this.panStartY) / this.zoom;

        this.x = this.panStartCamX - dx;
        this.y = this.panStartCamY - dy;

        this.clampToBounds();
    }

    /**
     * End panning
     */
    endPan() {
        this.isPanning = false;
    }

    /**
     * Zoom at a specific screen point
     */
    zoomAt(screenX, screenY, delta) {
        const worldBefore = this.screenToWorld(screenX, screenY);

        // Apply zoom
        const zoomFactor = delta > 0 ? 1.1 : 0.9;
        this.zoom = clamp(this.zoom * zoomFactor, this.minZoom, this.maxZoom);

        // Adjust camera position to keep the world point under the cursor
        const worldAfter = this.screenToWorld(screenX, screenY);
        this.x -= worldAfter.x - worldBefore.x;
        this.y -= worldAfter.y - worldBefore.y;

        this.clampToBounds();
    }

    /**
     * Set zoom level directly
     */
    setZoom(zoom) {
        this.zoom = clamp(zoom, this.minZoom, this.maxZoom);
        this.clampToBounds();
    }

    /**
     * Center camera on a world position
     */
    centerOn(worldX, worldY) {
        this.x = worldX;
        this.y = worldY;
        this.clampToBounds();
    }

    /**
     * Smoothly pan to a world position
     */
    panTo(worldX, worldY, duration = 500) {
        const startX = this.x;
        const startY = this.y;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const t = Math.min(elapsed / duration, 1);
            const easeT = 1 - Math.pow(1 - t, 3); // Ease out cubic

            this.x = lerp(startX, worldX, easeT);
            this.y = lerp(startY, worldY, easeT);
            this.clampToBounds();

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Clamp camera to map bounds
     */
    clampToBounds() {
        const halfWidth = this.canvas.width / 2 / this.zoom;
        const halfHeight = this.canvas.height / 2 / this.zoom;

        // Allow some margin around the map
        const margin = 200;
        this.x = clamp(this.x, -margin, this.mapWidth + margin);
        this.y = clamp(this.y, -margin, this.mapHeight + margin);
    }

    /**
     * Get visible world bounds
     */
    getVisibleBounds() {
        const halfWidth = this.canvas.width / 2 / this.zoom;
        const halfHeight = this.canvas.height / 2 / this.zoom;

        return {
            left: this.x - halfWidth,
            right: this.x + halfWidth,
            top: this.y - halfHeight,
            bottom: this.y + halfHeight
        };
    }

    /**
     * Check if a world point is visible
     */
    isVisible(worldX, worldY, margin = 0) {
        const bounds = this.getVisibleBounds();
        return worldX >= bounds.left - margin &&
               worldX <= bounds.right + margin &&
               worldY >= bounds.top - margin &&
               worldY <= bounds.bottom + margin;
    }

    /**
     * Apply camera transform to canvas context
     */
    applyTransform(ctx) {
        ctx.save();
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }

    /**
     * Restore canvas context after camera transform
     */
    restoreTransform(ctx) {
        ctx.restore();
    }

    /**
     * Set map bounds
     */
    setMapBounds(width, height) {
        this.mapWidth = width;
        this.mapHeight = height;
        this.clampToBounds();
    }

    /**
     * Fit view to show all of specified bounds
     */
    fitToBounds(minX, minY, maxX, maxY, padding = 50) {
        const width = maxX - minX + padding * 2;
        const height = maxY - minY + padding * 2;

        const zoomX = this.canvas.width / width;
        const zoomY = this.canvas.height / height;

        this.zoom = clamp(Math.min(zoomX, zoomY), this.minZoom, this.maxZoom);
        this.x = (minX + maxX) / 2;
        this.y = (minY + maxY) / 2;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Camera };
}
