import * as THREE from "three";
import { PNG } from "pngjs";
import importFiles from "./Utils.js";

const cthead = [];

importFiles(require.context("#/cthead/", true, /\.png$/), cthead);

export default class Loader {
    constructor() {}
    
    static async loadCTHeadTexture() {
        // const image = new THREE.ImageLoader().load(spingetfiddner);
        // const texture = new THREE.TextureLoader().load(spingetfiddner);
        
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

        let volumeTexture = this.create3DTextureFromPNGs(pngSlices);
        return volumeTexture;

        
        // return this.textureFrom16BitGreyscalePNG(png);

        // var canvas = document.createElement("canvas");
        // var context = canvas.getContext("2d");

        // const loader = new THREE.ImageBitmapLoader();
        // loader.setOptions( { imageOrientation: "flipY", } );
        // loader.load( spingetfiddner,
        //     function ( imageBitmap ) { // onLoad callback
        //         console.log(imageBitmap);
        //         // We need to load individual image slices of the 3D volume.
        //         // Apparently the only way to do this "natively" in JS is to render the image to a canvas and read back the pixel data
        //         // Otherwise we'd need to parse the image byte data using a thirdparty png/jpg/whatever parser
        //         // Three.js doesn't really read pixel data itself either, it passes a loaded HTMLImageElement to one of the WebGL texture load methods.

        //         canvas.width = image.width;
        //         canvas.height = image.height;
        //         context.drawImage(imageBitmap, 0, 0);
        //         var imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        //         // Now you can access pixel data from imageData.data.
        //         // It's a one-dimensional array of RGBA values.
        //         // Here's an example of how to get a pixel's color at (x,y)
        //         var index = (y*imageData.width + x) * 4;
        //         var red = imageData.data[index];
        //         var green = imageData.data[index + 1];
        //         var blue = imageData.data[index + 2];
        //         var alpha = imageData.data[index + 3];
        //     }, undefined,
        //     function (err) { // onError callback
        //         console.log("Failed to load image bitmap!", err); 
        //     }
        // );
        
        // console.log(image);
        // console.log(texture);

        // return texture;
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
                        console.log("[LOADER] Loaded image '" + url + "'");
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

        let depth = pngs.length;
        let width = pngs[0].width;
        let height = pngs[0].width;

        let pixelBufferF32 = new Float32Array(width * height * pngs.length);
        for (let z = 0; z < depth; z++) {
            let pngData = pngs[z].data;
            for (let y = 0; y < height; y++) {
                let offsetPng = y*width*4;
                let offset3d = z*width*height + y*width;
                for (let x = 0; x < width; x++) {
                    let rVal = pngData[offsetPng + x*4];
                    pixelBufferF32[offset3d + x] = rVal;
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

        return texture;
    }

    static textureFrom16BitGreyscalePNG(png) {
        let pixelBufferU16 = png.data;
        let pixelBufferF32 = this.uInt16ToFloat32Array(pixelBufferU16);
        
        //  It's important to note that different texture formats need to be sampled differently in glsl
        //  namely: UI data uses "usampler", I data uses "isampler" and other data uses "sampler".
        //  Also note that most formats might not actually be "texture filterable" which may cause issues with 3D texture interpolation
        //  Due to this a conversion to a float array may be preferrable.
        //  Also, the loaded array above is RRRA, not just R, the 3 channels are useless.

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
                
                //input[offset4 + i*4+1] = 60000;
                //input[offset4 + i*4+2] = 60000;
                //input[offset4 + i*4+3] = 60000;
                output[offset1 + i] = rVal;
            }
        }
        return output;
        /*
        var incomingData = new Uint8Array(buffer); // create a uint8 view on the ArrayBuffer
        var i, l = incomingData.length; // length, we need this for the loop
        var outputData = new Float32Array(incomingData.length); // create the Float32Array for output
        for (i = 0; i < l; i++) {
            outputData[i] = (incomingData[i] - 128) / 128.0; // convert audio to float
        }
        return outputData; // return the Float32Array
        */
    }
}