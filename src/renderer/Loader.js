import * as THREE from "three";
import { PNG } from "pngjs";
import importFiles from "~/utils.js";

const cthead = [];

importFiles(require.context("#/cthead/", true, /\.png$/), cthead);

export default class Loader {
    constructor() {}
    
    static async loadCTHeadTexture() {
        // PNGs are loaded using a third party png parser (pngjs).
        // JS doesn't really have a reliable way to load image files of more unusual formats (like 16 bit depth)

        const pngOptions = {
            colorType: 0, // 0 for greyscale with no alpha
            inputColorType: 0, // same as output
            bitDepth: 16, // 16 bit image
            skipRescale: true, // Disable normalizing back to the 0-255 range
        };

        let pngSlices = [];
        for (let i = 0; i < cthead.length; i++) {
            let slice = await this.loadPNG(cthead[i].data.default, pngOptions);
            pngSlices.push(slice);
        }

        let textureData = this.create3DTextureFromPNGs(pngSlices);
        return textureData;
    }

    /**
     * Loads a PNG image from the specified URL into a DataTexture of a format specified by the pngOptions.
     * @param {String} url
     * @param {PNGOptions} pngOptions See github repo for details
     * @see https://github.com/pngjs/pngjs
     * @returns {PNG} A promise with a value of the loaded pngjs PNG object
     */
    static loadPNG(url, pngOptions) {
        return new Promise((resolve, reject) => {
            fetch(url).then((response) => {
                return response.arrayBuffer();
            }).then((buffer) => {
                new PNG(pngOptions).parse(buffer, (error, data) => {
                    if (error) {
                        console.error("[LOADER] Failed to parse PNG image from: " + url + "!\nError: ", error);
                    } else {
                        console.debug("[LOADER] Loaded image '" + url + "'");
                        resolve(data);
                    }
                });
            }).catch(error => {
                console.error("[LOADER] Failed to parse PNG image from: " + url + "!\nError: ", error);
                reject(error);
            });
        });
    }

    /**
     * Loads a list of RGBA PNGs into a greyscale (R) 3D float texture.
     * @param {Array.<PNG>} pngs 
     */
    static create3DTextureFromPNGs(pngs) {
        if (pngs.length <= 0) {
            throw Error("[LOADER] At least one PNG image is required to create a 3D texture!");
        }

        // Loaded pngs are in the RGBA format even when they're greyscale
        // A float array is used because in general integer formats are not "filterable" in WebGL (can't use trilinear interpolation)

        let depth = pngs.length;
        let width = pngs[0].width;
        let height = pngs[0].width;
        
        let dataMin = Number.POSITIVE_INFINITY;
        let dataMax = 0;

        let pixelBufferF32 = new Float32Array(width * height * pngs.length);
        for (let z = 0; z < depth; z++) {
            let pngData = pngs[z].data;
            for (let y = 0; y < height; y++) {
                let offsetPng = y*width*4;
                let offset3d = z*width*height + y*width;
                for (let x = 0; x < width; x++) {
                    let rVal = pngData[offsetPng + x*4];
                    pixelBufferF32[offset3d + x] = rVal;
                    if (rVal < dataMin) dataMin = rVal;
                    if (rVal > dataMax) dataMax = rVal;
                }
            }
        }

        let texture = new THREE.Data3DTexture(pixelBufferF32, width, height, depth);
        texture.format = THREE.RedFormat;
        texture.type = THREE.FloatType;
        texture.internalFormat = "R32F";

        texture.minFilter = texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;

        return {texture, dataMin, dataMax};
    }

    static textureFrom16BitGreyscalePNG(png) {
        let pixelBufferU16 = png.data;
        let pixelBufferF32 = this.uInt16ToFloat32Array(pixelBufferU16);
    
        let texture = new THREE.DataTexture(pixelBufferF32, png.width, png.height,
            THREE.RedFormat,
            THREE.FloatType
        );
        texture.internalFormat = "R32F";
        texture.needsUpdate = true;
        return texture;
    }

    static uInt16ToFloat32Array(input) {
        let output = new Float32Array(input.length / 4);
        for (let k = 0; k < 256; k++) {
            let offset4 = k*4*256;
            let offset1 = k*256;
            for (let i = 0; i < 256; i++) {
                let rVal = input[offset4 + i*4];
                output[offset1 + i] = rVal;
            }
        }
        return output;
    }
}