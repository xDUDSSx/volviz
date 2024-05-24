import { Group, DirectionalLight, AmbientLight} from "three";

export default class BasicLights extends Group {
    constructor(...args) {
        super(...args);

        const ambi = new AmbientLight(0xffffff, 0.4);
        const dir = new DirectionalLight(0xffffff, 1.0);
        dir.position.set(3, 7, 1);

        this.add(dir, ambi);
    }
}
