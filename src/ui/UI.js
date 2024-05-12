import DraggableTweakpane from "./draggable-tweakpane/draggable-tweakpane.js";
import * as CamerakitPlugin from "@tweakpane/plugin-camerakit";

import "./general.css";

export default class UI {
    static createUI(settings) {
        const pane = new DraggableTweakpane({
            x: -8, y: 8,
            width: 320,
            title: "Controls",
            expanded: true,
        });
        pane.registerPlugin(CamerakitPlugin);
        
        pane.addBlade({
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

        pane.addBinding(settings, "samples", {
            view: "camerawheel",
            amount: -0.2,
            min: 1,
            max: 200,
            step: 1
        });
        pane.addBinding(settings, "noise", {
            view: "camerawheel",
            amount: -0.001,
            min: 0.0,
            max: 1.0,
            format: (v) => v.toFixed(3),
        });
    }
}