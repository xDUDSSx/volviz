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
            label: "method",
            options: [
                {text: "ClearView", value: 0},
                {text: "Illustrative", value: 1},
            ],
            value: settings.method,
        }).on("change", (e) => {
            settings.method = e.value;
            switch(settings.method) {
            case 0:
                clearview.expanded = true;
                contextPreserve.expanded = false;
                importanceAware.expanded = false;
                
                clearview.hidden = false;
                contextPreserve.hidden = true;
                importanceAware.hidden = true;
                break;
            default:
                clearview.expanded = false;
                contextPreserve.expanded = true;
                importanceAware.expanded = true;   

                clearview.hidden = true;
                contextPreserve.hidden = false;
                importanceAware.hidden = false;
            }
        });

        this.pane.addBlade({
            view: "list",
            label: "mode",
            options: [
                {text: "opacity", value: 0},
                {text: "average", value: 1},
                {text: "importance-aware", value: 2},
                {text: "context-preserve", value: 3},
            ],
            value: settings.mode,
        }).on("change", (e) => {
            settings.mode = e.value;
        });

        this.pane.addBinding(settings, "samples", {
            min: 1,
            max: 512,
            step: 1
        });
        this.pane.addBinding(settings, "noise", {
            view: "camerawheel",
            amount: -0.001,
            min: 0.0,
            max: 1.0,
            format: (v) => v.toFixed(3),
        });
        this.pane.addBinding(settings, "axesVisible", {
            label: "show axes"
        });


        const clearview = this.pane.addFolder({
            title: "ClearView",
            expanded: true,
        });
        clearview.addBinding(settings, "controlPointVisible", {
            label: "edit focus point"
        });
        clearview.addBinding(settings, "focusArea", {
            label: "focus area",
            min: 0.0,
            max: 2.0,
        });
        clearview.addBinding(settings, "focusAreaSharpness", {
            label: "focus sharpness",
            min: 1.0,
            max: 10.0,
        });
        clearview.addBlade({
            view: "separator",
        });
        clearview.addBlade({
            view: "list",
            label: "importance method",
            options: [
                {text: "view distance", value: 0},
                {text: "distance", value: 1},
                {text: "curvature", value: 3},
            ],
            value: settings.importanceMethod,
        }).on("change", (e) => {
            settings.importanceMethod = e.value;
            switch(settings.importanceMethod) {
            case 0:
                curvatureMultiplier.hidden = true;
                distanceMultiplier.hidden = false;
                break;
            case 3:
                curvatureMultiplier.hidden = false;
                distanceMultiplier.hidden = true;
                break;
            default:
                curvatureMultiplier.hidden = true;
                distanceMultiplier.hidden = true;
            }
        });
        let curvatureMultiplier = clearview.addBinding(settings, "curvatureMultiplier", {
            label: "curvature multiplier",
            min: 0.0,
            max: 4.0,
        });
        let distanceMultiplier = clearview.addBinding(settings, "distanceMultiplier", {
            label: "distance strength",
            min: 0.0,
            max: 20.0,
        });
        curvatureMultiplier.hidden = false;
        distanceMultiplier.hidden = true;

        clearview.addBlade({
            view: "separator",
        });
        let isovalueSettings = {
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
        };
        clearview.addBinding(settings, "isovalue1", isovalueSettings);
        clearview.addBinding(settings, "isovalue2", isovalueSettings);

        clearview.addBinding(settings, "normalSampleFactor", {
            label: "normal factor",
            // view: "camerawheel",
            // amount: -0.001,
            min: 0.0,
            max: 2.0,
            format: (v) => v.toFixed(3),
        });
        clearview.addBinding(settings, "worldSpaceLighting", {
            label: "world space shading"
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
            min: 0.1,
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

        clearview.hidden = false;
        importanceAware.hidden = true;
        contextPreserve.hidden = true;
    }
}