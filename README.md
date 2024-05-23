# Direct volume renderer using THREE.js
## Illustrative visualization of volumetric data
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This project implements three different illustrative techniques for the visualization of volume data and allows the user to switch between the techniques and interactively change various parameters.
The renderer is using THREE.js and WebGL 2. The volumetric data is raymarched inside GLSL shaders.

[Online Demo]([http://edwinwebb.github.io/three-seed/](https://xdudssx.github.io/volviz/))

![image](https://github.com/xDUDSSx/volviz/assets/44985061/428befef-d134-4bc2-9ae8-6a4fec9099ac)

Implemented techniques:
[1] Kruger, J., Schneider, J. and Westermann, R., 2006. Clearview: An interactive context-preserving hotspot visualization technique. IEEE Transactions on Visualization and Computer Graphics, 12(5), pp.941-948.
[2] de Moura Pinto, F. and Freitas, C.M., 2010, August. Importance-aware composition for illustrative volume rendering. In 2010 23rd SIBGRAPI Conference on Graphics, Patterns and Images (pp. 134-141). IEEE.
[3] Bruckner, S., Grimm, S., Kanitsar, A. and Gröller, M.E., 2005, May. Illustrative context-preserving volume rendering. In EuroVis (pp. 69-76).

*Originally written as semestral work for the Visualization class at Czech Technical University in Prague.*

## Running the dev server
```bash
npm start
```

## Building the project for the web
Once you are happy with your project you'll be sure to want to show it off. Running `npm run build` in terminal will bundle your project into the folder `./build/`. You can upload this directory to a web server. For more complex results read [this guide](https://webpack.js.org/guides/production/).

## Thanks
The project used the [three-seed](https://github.com/edwinwebb/three-seed) starter template by edwinwebb (MIT)
