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
            width: 340,
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
            ],
            value: settings.mode,
        }).on("change", (e) => {
            settings.mode = e.value;
        });

        this.pane.addBinding(settings, "samples", {
            min: 1,
            max: 400,
            step: 1
        });
        this.pane.addBinding(settings, "noise", {
            view: "camerawheel",
            amount: -0.001,
            min: 0.0,
            max: 1.0,
            format: (v) => v.toFixed(3),
        });
        this.pane.addBinding(settings, "normalSampleFactor", {
            label: "normal factor",
            // view: "camerawheel",
            // amount: -0.001,
            min: 0.0,
            max: 2.0,
            format: (v) => v.toFixed(3),
        });
        this.pane.addBinding(settings, "isovalue1", {
            view: "cameraring",
            series: 1,
            unit: {
                // Pixels for the unit
                pixels: 80,
                // Number of ticks for the unit
                ticks: 10,
                // Amount of a value for the unit
                value: 0.1,
            },
            min: 0.0,
            max: 1.0,
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