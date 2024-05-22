import DraggableTweakpane from "./draggable-tweakpane/draggable-tweakpane.js";
import * as CamerakitPlugin from "@tweakpane/plugin-camerakit";

import "./general.css";

export default class UI {
    pane;
    loadingPane;
    
    loadingButton;

    constructor(settings) {
        // Controls pane
        this.pane = new DraggableTweakpane({
            x: -8, y: 8,
            width: 320,
            title: "Controls",
            expanded: true,
        });
        this.pane.registerPlugin(CamerakitPlugin);
        
        this.pane.addBlade({
            view: "list",
            label: "mode",
            options: [
                {text: "opacity", value: 0},
                {text: "average", value: 1},
                {text: "importance-aware", value: 2},
                {text: "context-preserve", value: 3}
            ],
            value: settings.mode,
        }).on("change", (e) => {
            settings.mode = e.value;
        });

        this.pane.addBinding(settings, "samples", {
            view: "camerawheel",
            amount: -0.2,
            min: 1,
            max: 200,
            step: 1
        });
        this.pane.addBinding(settings, "noise", {
            view: "camerawheel",
            amount: -0.001,
            min: 0.0,
            max: 1.0,
            format: (v) => v.toFixed(3),
        });

        const importanceAware = this.pane.addFolder({
            title: "Importance-Aware Parameters",
            expanded: false,
        });
        importanceAware.addBinding(settings, "wgrad", {
            view: "slider",
            min: 0.0,
            max: 1.0,
            step: 0.01,
            format: (v) => v.toFixed(3),
        });
        importanceAware.addBinding(settings, "wsil", {
            view: "slider",
            min: 0.0,
            max: 1.0,
            step: 0.01,
            format: (v) => v.toFixed(3),
        });
        importanceAware.addBinding(settings, "wlight", {
            view: "slider",
            min: 0.0,
            max: 1.0,
            step: 0.01,
            format: (v) => v.toFixed(3),
        });

        const contextPreserve = this.pane.addFolder({
            title: "Context-Preserve Parameters",
            expanded: false,
        });
        contextPreserve.addBinding(settings, "ks", {
            view: "slider",
            min: 0.0,
            max: 1.0,
            step: 0.01,
            format: (v) => v.toFixed(3),
        });
        contextPreserve.addBinding(settings, "kt", {
            view: "slider",
            min: 0.0,
            max: 15.0,
            step: 0.1,
            format: (v) => v.toFixed(3),
        });
        
        // Loading pane
        this.loadingPane = new DraggableTweakpane({
            x: document.body.clientWidth / 2 - 128,
            y: document.body.clientHeight / 2 - 128,
            width: 256,
            title: "Loading",
            expanded: true,
        });
        this.loadingButton = this.loadingPane.addButton({
            title: "0 %",
        });
    }
}