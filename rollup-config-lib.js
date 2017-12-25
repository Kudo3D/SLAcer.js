import sourcemaps from 'rollup-plugin-sourcemaps';

export default [{
    input: 'src/slacer/index.js',
    output: {
        name: 'SLAcer',
        format: 'iife',
        external: ['SLAcer', 'THREE', 'JSZip', 'saveAs', '_', '$'],
        file: 'dist/lib/slacer.js',
        sourcemap: true,
    },
    // moduleName: 'SLAcer',
    plugins: [
        sourcemaps()
    ]
},
{
    input: 'src/loader/index.js',
    output: {
        name: 'MeshesJS',
        format: 'iife',
        external: ['THREE'],
        file: 'dist/lib/meshes.js',
        sourcemap: true,
    },
    // moduleName: 'stlLoader',
    plugins: [
        sourcemaps()
    ]
}];
