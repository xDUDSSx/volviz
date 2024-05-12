import {Pane} from "tweakpane";
import interact from "interactjs";
import "./draggable-tweakpane.css";

var containerHtml = "<!-- Draggable tweakpane container -->";

/**
 * Tweakpane library (nor dat.gui) doesn't contain a mechanism for the generated pane component to be moved.
 * It just simply sticks it in the top right corner. I'd call that not ideal.
 * 
 * This class directly extends the tweakpane Pane class and makes it draggable.
 */
export default class DraggableTweakpane extends Pane {
    static #injectedInteractJs = false;

    minWidth = 100;
    maxWidth = Number.POSITIVE_INFINITY;

    dragDistance = 0;
    #clickBlocker;

    /**
     * Create a new draggable tweakpane.
     * @param {Number} x Starting x position of the pane in pixels, can be negative to right align.
     * @param {Number} y Starting y position of the pane in pixels, can be negative to bottom align.
     * @param {PaneConfig} config Tweakpane PaneConfig 
     */
    constructor(config) {
        let container = document.createElement("div");
        container.classList.add("draggable-tweakpane");
        container.innerHTML = containerHtml;
        document.body.appendChild(container);
        
        config["container"] = container;
        super(config);

        this.container = container;

        this.width = config.width ?? 256;
        
        config.x = config.x ?? -8;
        config.y = config.y ?? 8;

        if (config.x < 0) {
            this.x = document.documentElement.clientWidth - this.width + config.x;
        } else {
            this.x = config.x;
        }
        if (config.y < 0) {
            this.y = document.documentElement.clientHeight - this.height + config.y;
        } else {
            this.y = config.y;
        }

        this.#clickBlocker = (event) => {
            event.stopPropagation();
        };

        this.#checkBounds();

        this.#makeDraggable();

        addEventListener("resize", () => {
            this.#checkBounds();
        });
    }
    
    get x() {
        return this.container.offsetLeft;
    }
    set x(value) {
        this.container.style.left = value + "px";
    }
    get y() {
        return this.container.offsetTop;
    }
    set y(value) {
        this.container.style.top = value + "px";
    }
    get width() {
        return this.container.clientWidth;
    }
    set width(value) {
        this.container.style.width = value + "px";
    }
    get height() {
        return this.container.clientHeight;
    }
    set height(value) {
        this.container.style.height = value + "px";
    }

    get hidden() {
        return super.hidden;
    }
    set hidden(value) {
        super.hidden = value;
        this.container.style.display = value ? "none" : "block";
    }
    
    dispose() {
        super.dispose();
        this.container.remove();
    }

    #makeDraggable() {  
        this.container.draggableTweakpane = this;

        let tweakpaneHeader = this.container.querySelector("button.tp-rotv_b");
        let tweakpaneMiddleHeader = tweakpaneHeader.querySelector(".tp-rotv_t");
        tweakpaneMiddleHeader.classList.add("draggable-tweakpane-header");
        tweakpaneMiddleHeader.addEventListener("click", this.#clickBlocker);
        tweakpaneMiddleHeader.addEventListener("pointerup", () => {
            if (this.dragDistance < 3) {
                this.expanded = !this.expanded;
            }
        });

        let widthHandleElement = tweakpaneHeader.appendChild(document.createElement("div"));
        if (widthHandleElement) {
            widthHandleElement.classList.add("draggable-tweakpane-resize-handle");
            widthHandleElement.textContent = "↔";

            widthHandleElement.addEventListener("click", this.#clickBlocker);
        }

        if (!DraggableTweakpane.#injectedInteractJs) {
            DraggableTweakpane.#injectedInteractJs = true;
            interact(".draggable-tweakpane")
                .draggable({
                    allowFrom: ".draggable-tweakpane-header",
                    modifiers: [
                        interact.modifiers.restrictRect({
                            restriction: "parent",
                            endOnly: false
                        })
                    ],
                    autoScroll: false,
                    listeners: {
                        move (event) {
                            var target = event.target;
                            var x = target.draggableTweakpane.x + event.dx;
                            var y = target.draggableTweakpane.y + event.dy;
                        
                            target.draggableTweakpane.dragDistance += Math.hypot(event.dx, event.dy);
                        
                            target.draggableTweakpane.x = x;
                            target.draggableTweakpane.y = y;
                        },
                        end (event) {
                            var target = event.target;
                            target.draggableTweakpane.dragDistance = 0;
                        }
                    }
                })
                .resizable({
                    edges: { right: ".draggable-tweakpane-resize-handle"},
                    axis: "x",
                    inertia: false,
                    margin: 10,
                    listeners: {
                        move (event) {
                            var target = event.target;
                            var x = target.draggableTweakpane.x;
                            var y = target.draggableTweakpane.y;

                            if (event.rect.width >= target.draggableTweakpane.minWidth) {
                                target.style.width = event.rect.width + "px";
                                if (event.rect.width > target.draggableTweakpane.minWidth)
                                    x += event.deltaRect.left;

                                target.draggableTweakpane.x = x;
                                target.draggableTweakpane.y = y;
                            }
                        }
                    },
                    modifiers: [
                        interact.modifiers.restrictEdges({
                            outer: "parent"
                        }),
                    ],
                });
        }
    }

    #checkBounds() {
        const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

        let documentWidth = document.documentElement.clientWidth;
        let documentHeight = document.documentElement.clientHeight;
        this.container.style.left = clamp(this.container.offsetLeft, 0, Math.max(0, documentWidth - this.container.clientWidth)) + "px";
        this.container.style.top = clamp(this.container.offsetTop, 0, Math.max(0, documentHeight - this.container.clientHeight)) + "px";

        if (documentWidth < this.container.clientWidth) {
            this.container.style.width = Math.max(this.minWidth, Math.min(this.maxWidth, documentWidth)) + "px";
        }
    }
}
