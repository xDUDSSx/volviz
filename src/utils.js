
export function importFiles(obj, arr) {
    // r.keys().forEach((key) => (cthead[key] = r(key)));
    obj.keys().forEach((key) => (arr.push({name: key, data: obj(key)})));
}

export function threeJsShaderDebugCallback(gl, program, glVertexShader, glFragmentShader) {
    
    // The default Three.js debug callback

    const programLog = gl.getProgramInfoLog( program ).trim();
    
    const vertexErrors = getShaderErrors( gl, glVertexShader, "vertex" );
    const fragmentErrors = getShaderErrors( gl, glFragmentShader, "fragment" );

    console.error(
        "THREE.WebGLProgram: Shader Error " + gl.getError() + " - " +
        "VALIDATE_STATUS " + gl.getProgramParameter( program, gl.VALIDATE_STATUS ) + "\n\n" +
        "Program Info Log: " + programLog + "\n" +
        vertexErrors + "\n" +
        fragmentErrors
    );

    function getShaderErrors( gl, shader, type ) {
        const status = gl.getShaderParameter( shader, gl.COMPILE_STATUS );
        const errors = gl.getShaderInfoLog( shader ).trim();
    
        if ( status && errors === "" ) return "";
    
        const errorMatches = /ERROR: 0:(\d+)/.exec( errors );
        if ( errorMatches ) {
    
            // --enable-privileged-webgl-extension
            // console.log( '**' + type + '**', gl.getExtension( 'WEBGL_debug_shaders' ).getTranslatedShaderSource( shader ) );
    
            const errorLine = parseInt( errorMatches[ 1 ] );
            return type.toUpperCase() + "\n\n" + errors + "\n\n" + handleSource( gl.getShaderSource( shader ), errorLine );
    
        } else {
    
            return errors;
    
        }
    }
    
    function handleSource( string, errorLine ) {
        const lines = string.split( "\n" );
        const lines2 = [];
    
        const from = Math.max( errorLine - 6, 0 );
        const to = Math.min( errorLine + 6, lines.length );
    
        for ( let i = from; i < to; i ++ ) {
    
            const line = i + 1;
            lines2.push( `${line === errorLine ? ">" : " "} ${line}: ${lines[ i ]}` );
    
        }
    
        return lines2.join( "\n" );
    }

    // Attach full shader sources

    const parseForErrors = function(gl, shader, name) {
        const errors = gl.getShaderInfoLog(shader).trim();
        const prefix = "Errors in " + name + ":" + "\n\n" + errors;
        
        if (errors !== "") {
            const code = gl.getShaderSource(shader).replaceAll("\t", "  ");
            const lines = code.split("\n");
            var linedCode = "";
            var i = 1;
            for (var line of lines) {
                linedCode += (i < 10 ? " " : "") + i + ":\t\t" + line + "\n";
                i++;
            }
            
            console.groupCollapsed("Full source of " + name);
            console.error(prefix + "\n" + linedCode);
            console.groupEnd();
        }
    };

    parseForErrors(gl, glVertexShader, "Vertex Shader");
    parseForErrors(gl, glFragmentShader, "Fragment Shader");
}