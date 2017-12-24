/* global SLAcer, THREE, MeshesJS, JSZip, saveAs, _,  $ */

// -----------------------------------------------------------------------------
// variables
// -----------------------------------------------------------------------------
//window.localStorage.clear();
let settings = new SLAcer.Settings({
    file: {
        panel: {
            collapsed: false,
            position: 0
        }
    },
    slicer: {
        layers: {
            height: 100 // μm
        },
        light: {
            on: 1000,
            off: 500
        },
        zip: true,
        svg: false,
        png: true,
        speed: false,
        speedDelay: 10, // ms
        panel: {
            collapsed: false,
            position: 1
        },
        lifting: {
            speed: 50, // mm/min
            height: 3,  // mm
        }
    },
    mesh: {
        panel: {
            collapsed: false,
            position: 2
        }
    },
    transform: {
        panel: {
            collapsed: false,
            position: 3
        },
        mirror: false
    },
    buildVolume: {
        size: { x: 100, y: 100, z: 100 }, // mm
        unit: 'mm',                         // mm or in
        color: 0xcccccc,
        opacity: 0.1,
        panel: {
            collapsed: false,
            position: 4
        }
    },
    resin: {
        density: 1.1, // g/cm3
        price: 50,   // $
        panel: {
            collapsed: false,
            position: 5
        }
    },
    screen: {
        width: window.screen.width,
        height: window.screen.height,
        diagonal: { size: 22, unit: 'in' },
        panel: {
            collapsed: false,
            position: 6
        }
    },
    colors: {
        mesh: '#eb0984',
        slice: '#88ee11',
        panel: {
            collapsed: false,
            position: 7
        }
    },
    viewer3d: {
        color: 0xffffff
    }
});

// -----------------------------------------------------------------------------
// Error handler
// -----------------------------------------------------------------------------
function errorHandler(error) {
    // eslint-disable-next-line no-console 
    console.error(error);
}

// -----------------------------------------------------------------------------
// Slicer
// -----------------------------------------------------------------------------
let slicer = new SLAcer.Slicer();
let shapes, slices;

function removeShapes() {
    if (shapes && shapes.length) {
        for (let i = 0, il = shapes.length; i < il; i++) {
            viewer3d.removeObject(shapes[i]);
        }
    }
}

function removeSlices() {
    if (slices && slices.length) {
        for (let i = 0, il = slices.length; i < il; i++) {
            viewer2d.removeObject(slices[i]);
        }
    }

    sliceImage('none');
}

function hexToDec(hex) {
    return parseInt(hex.toString().replace('#', ''), 16);
}

function sliceImage(dataURL) {
    settings.set('slice.dataURL', dataURL || 'none');
}

function getSlice(layerNumber) {
    // remove old shapes
    removeSlices();
    removeShapes();

    // ...
    $slicerLayerValue.html(layerNumber);

    if (layerNumber < 1) {
        viewer2d.render();
        viewer3d.render();
        return;
    }

    if (transformations.update) {
        throw 'transformations not applyed...';
    }

    // get position
    layerHeight = settings.get('slicer.layers.height') / 1000;
    zPosition = layerNumber * layerHeight;

    // get faces
    let faces = slicer.getFaces(zPosition);

    //console.log('layer number:', layerNumber);
    //console.log('z position  :', zPosition);

    // get new shapes list
    shapes = faces.meshes;
    zPosition -= viewer3d.buildVolume.size.z / 2;

    // slices
    slices = [];
    let slice, shape;
    let sliceColor = hexToDec(settings.get('colors.slice'));

    // add new shapes
    for (let i = 0, il = shapes.length; i < il; i++) {
        shape = shapes[i];
        slice = shape.clone();

        slice.material = slice.material.clone();
        slice.material.color.setHex(0xffffff);
        viewer2d.addObject(slice);
        slices.push(slice);

        shape.material.color.setHex(sliceColor);
        shape.material.depthTest = false;
        shape.position.z = zPosition;
        viewer3d.scene.add(shape);
    }

    // render 3D view
    viewer3d.render();

    // render 2D view
    viewer2d.screenshot(function (dataURL) {
        sliceImage(dataURL);

        if (PNGExport) {
            let fileName = layerNumber + '.png';
            let imgData = dataURL.substr(dataURL.indexOf(',') + 1);
            zipFolder.file(fileName, imgData, { base64: true });
        }
    });

    function SVGPath(actions, dir, xOffset, yOffset) {
        let path = [];
        let area = 0;
        let a, b, c, x, y;

        if (dir != 'ccw') {
            dir = 'cw';
        }

        actions.push({ action: 'lineTo', args: actions[0].args });

        for (let i = 0, il = actions.length; i < il; i++) {
            a = actions[i];

            if (i > 0) {
                b = actions[i - 1];
                area += a.args[0] * b.args[1];
                area -= b.args[0] * a.args[1];
            }

            c = a.action == 'moveTo' ? 'M' : 'L';
            x = (a.args[0] + xOffset);
            y = (a.args[1] + yOffset);

            path.push(c + x + ' ' + y);
        }

        if (dir == 'cw' && area < 0 || dir == 'ccw' && area > 0) {
            path = path.reverse();
            path[0] = path[0].replace(/^L/, 'M');
            path[actions.length - 1] = path[actions.length - 1].replace(/^M/, 'L');
        }

        return path.join(' ') + ' Z ';
    }

    // SVG export
    if (SVGExport) {
        // offset for positive coords
        let xOffset = Math.abs(slicer.mesh.geometry.boundingBox.min.x);
        let yOffset = Math.abs(slicer.mesh.geometry.boundingBox.min.y);



        // svg start
        let size = slicer.mesh.getSize();
        let svg = '<svg version="1.1" width="' + size.x + '" height="' + size.y + '" baseProfile="full" xmlns="http://www.w3.org/2000/svg">\n';

        // svg background
        svg += '<rect x="0" y="0" width="100%" height="100%" style="fill:black; stroke:none"/>\n';

        // fix coordinate system (rotate 180°)
        svg += '<g transform="translate(0, ' + size.y + ') scale(1, -1)">\n';

        // draw main paths
        let actions;
        for (let i = 0, il = faces.shapes.length; i < il; i++) {
            actions = faces.shapes[i].actions;

            // path start
            svg += '<path d="';

            // main paths
            svg += SVGPath(actions, 'cw', xOffset, yOffset);

            // holes paths
            let holes = faces.shapes[i].holes;
            for (let j = 0, jl = holes.length; j < jl; j++) {
                svg += SVGPath(holes[j].actions, 'ccw');
            }

            // path end
            svg += '" style="fill:white; stroke:none" />\n';
        }

        // svg end
        svg += '</g>';
        svg += '</svg>';

        // add svg file to zip
        zipFolder.file(layerNumber + '.svg', svg);
    }
}

// -----------------------------------------------------------------------------
// UI
// -----------------------------------------------------------------------------
// Main container
let $main = $('#main');

// Viewer 3D
let $viewer3d = $('#viewer3d');
let viewer3d = new SLAcer.Viewer3D({
    color: settings.get('viewer3d.color'),
    buildVolume: settings.get('buildVolume'),
    target: $viewer3d[0]
});

// Triangulation algorithm
//THREE.Triangulation.setTimer(true);
THREE.Triangulation.setLibrary('earcut');
//THREE.Triangulation.setLibrary('libtess');
//THREE.Triangulation.setLibrary('poly2tri');

// Viewer 2D
let viewer2dWin = null;
let $openViewer2D = $('#open-viewer-2d');

let viewer2d = new SLAcer.Viewer2D({
    target: null, // off-screen
    color: 0x000000,
    buildPlate: {
        size: settings.get('buildVolume.size'),
        unit: settings.get('buildVolume.unit'),
        color: 0x000000,
        opacity: 0 // hide build plate
    },
    size: settings.get('screen')
});

$openViewer2D.click(function () {
    if (viewer2dWin == null || viewer2dWin.closed) {
        let screen = settings.get('screen');
        let size = 'width=' + screen.width + ', height=' + screen.height;
        let opts = 'menubar=0, toolbar=0, location=0, directories=0, personalbar=0, status=0, resizable=1, dependent=0';

        viewer2dWin = window.open('viewer2d.html', 'SLAcerViewer2D', size + ', ' + opts);

        $(viewer2dWin).on('beforeunload', function () {
            viewer2dWin = null;
        })
            .load(function () {
                getSlice($sliderInput.slider('getValue'));
            });
    }
    else {
        viewer2dWin.focus();
    }

    return false;
});

// Slider
let $sliderInput = $('#slider input');

$sliderInput.slider({ reversed: true }).on('change', function (e) {
    getSlice(e.value.newValue);
});

let $sliderElement = $('#slider .slider');
let $sliderMaxValue = $('#slider .max');

function updateSliderUI() {
    let layersHeight = settings.get('slicer.layers.height') / 1000;
    let layersNumber = Math.floor(slicer.mesh.getSize().z / layersHeight);

    $sliderInput.slider('setAttribute', 'max', layersNumber);
    $sliderMaxValue.html(layersNumber);
    $slicerLayersValue.html(layersNumber);
}

// Sidebar
let $sidebar = $('#sidebar');
// let $panels = $sidebar.find('.panel');

$sidebar.sortable({
    axis: 'y',
    handle: '.panel-heading',
    cancel: '.panel-toggle',
    placeholder: 'panel-placeholder', forcePlaceholderSize: true,
    // update panel position
    stop: function () {
        $sidebar.find('.panel').each(function (i, element) {
            settings.set(_.camelCase(element.id) + '.panel.position', i);
        });
    }
});

// Sort panels
let panels = [];
// let panel;

_.forEach(settings.settings, function (item, namespace) {
    if (item && item.panel) {
        panels[item.panel.position] = $('#' + _.kebabCase(namespace));
    }
});

for (let i in panels) {
    $sidebar.append(panels[i]);
}

// Init panel
function initPanel(name) {
    let id = _.kebabCase(name);
    name = _.camelCase(name);
    let $body = $('#' + id + '-body');

    $body.on('hidden.bs.collapse', function () {
        settings.set(name + '.panel.collapsed', true);
    });

    $body.on('shown.bs.collapse', function () {
        settings.set(name + '.panel.collapsed', false);
    });

    if (settings.get(name + '.panel.collapsed')) {
        $body.collapse('hide');
    }

    return $body;
}

// Unit converter
function parseUnit(value, unit) {
    return parseFloat(unit == 'in' ? (value / 25.4) : (value * 25.4));
}

// File panel
let $fileBody = initPanel('file');
let $fileInput = $fileBody.find('#file-input');
let loadedFile = null;

$fileInput.on('change', function (e) {
    resetTransformValues();
    loadedFile = e.target.files[0];
    loader.loadFile(loadedFile);
});

// Mesh panel
let $meshBody = initPanel('mesh');
let $meshFaces = $meshBody.find('#mesh-faces');
let $meshVolume = $meshBody.find('#mesh-volume');
let $meshWeight = $meshBody.find('#mesh-weight');
let $meshCost = $meshBody.find('#mesh-cost');
let $meshSizeX = $meshBody.find('#mesh-size-x');
let $meshSizeY = $meshBody.find('#mesh-size-y');
let $meshSizeZ = $meshBody.find('#mesh-size-z');
let $meshSizeUnit = $meshBody.find('.mesh-size-unit');

function updateMeshInfoUI() {
    let mesh = slicer.mesh;
    let size = mesh.getSize();
    let unit = settings.get('buildVolume.unit');

    updateSliderUI();

    $meshSizeUnit.html(unit);

    if (unit == 'in') {
        size.x = parseUnit(size.x, 'in');
        size.y = parseUnit(size.y, 'in');
        size.z = parseUnit(size.z, 'in');
    }

    $meshSizeX.html(size.x.toFixed(2));
    $meshSizeY.html(size.y.toFixed(2));
    $meshSizeZ.html(size.z.toFixed(2));

    let volume = parseInt(mesh.getVolume() / 1000);                   // cm3/ml
    let weight = (volume * settings.get('resin.density')).toFixed(2); // g
    let cost = volume * settings.get('resin.price') / 1000;

    $meshFaces.html(mesh.geometry.faces.length);
    $meshVolume.html(volume);
    $meshWeight.html(weight);
    $meshCost.html(cost);
}

// Slicer panel
let $slicerBody = initPanel('slicer');
let $slicerLayerHeight = $slicerBody.find('#slicer-layers-height');
let $slicerLayersValue = $slicerBody.find('#slicer-layers-value');
let $slicerLayerValue = $slicerBody.find('#slicer-layer-value');
let $slicerLightOff = $slicerBody.find('#slicer-light-off');
let $slicerLightOn = $slicerBody.find('#slicer-light-on');

let $slicerLiftingSpeed = $slicerBody.find('#slicer-lifting-speed');
let $slicerLiftingHeight = $slicerBody.find('#slicer-lifting-height');

let $slicerExportPNG = $slicerBody.find('#slicer-image-extension-png');
let $slicerExportSVG = $slicerBody.find('#slicer-image-extension-svg');

let $slicerSpeedYes = $slicerBody.find('#slicer-speed-yes');
let $slicerSpeedDelay = $slicerBody.find('#slicer-speed-delay');
let $slicerMakeZipYes = $slicerBody.find('#slicer-make-zip-yes');
let $sliceButton = $sidebar.find('#slice-button');
let $abortButton = $sidebar.find('#abort-button');
let $zipButton = $sidebar.find('#zip-button');

function updateSlicerUI() {
    let slicer = settings.get('slicer');

    $slicerSpeedDelay.val(slicer.speedDelay);
    $slicerLayerHeight.val(slicer.layers.height);
    $slicerLightOff.val(slicer.light.off);
    $slicerLightOn.val(slicer.light.on);

    $slicerLiftingSpeed.val(slicer.lifting.speed);
    $slicerLiftingHeight.val(slicer.lifting.height);
}

function updateSlicerSettings() {
    settings.set('slicer.layers.height', $slicerLayerHeight.val());
    settings.set('slicer.light.off', $slicerLightOff.val());
    settings.set('slicer.light.on', $slicerLightOn.val());

    settings.set('slicer.lifting.speed', $slicerLiftingSpeed.val());
    settings.set('slicer.lifting.height', $slicerLiftingHeight.val());

    settings.set('slicer.png', $slicerExportPNG[0].checked);
    settings.set('slicer.svg', $slicerExportSVG[0].checked);

    settings.set('slicer.zip', $slicerMakeZipYes[0].checked);
    settings.set('slicer.speed', $slicerSpeedYes[0].checked);
    settings.set('slicer.speedDelay', $slicerSpeedDelay.val());

    getSlice($sliderInput.slider('getValue'));

    updateSliderUI();
}

let sliceInterval;
let expectedSliceInterval;
let currentSliceNumber;
let slicesNumber;
let zipFile;
let zipFolder;

let SVGExport;
let PNGExport;

let layerHeight;
let zPosition;

// let exposureTime;
// let liftingSpeed;
// let liftingHeight;
// let liftingTime;
// let estimatedTime;

function slice() {
    currentSliceNumber++;

    if (currentSliceNumber > slicesNumber) {
        return endSlicing();
    }

    getSlice(currentSliceNumber);
    $sliderInput.slider('setValue', currentSliceNumber);

    let time = Date.now();
    let diff = time - expectedSliceInterval;

    !settings.get('slicer.speed') && viewer2dWin && setTimeout(function () {
        sliceImage('none');
    }, settings.get('slicer.light.on'));

    expectedSliceInterval += sliceInterval;
    setTimeout(slice, Math.max(0, sliceInterval - diff));
}

function endSlicing() {
    sliceImage('none');
    $sidebar.find('input, button').prop('disabled', false);
    $sliderInput.slider('enable');
    $abortButton.addClass('hidden');
    $sliceButton.removeClass('hidden');
    $zipButton.prop('disabled', !zipFile);
}

function startSlicing() {
    let times = settings.get('slicer.light');

    if (settings.get('slicer.speed')) {
        sliceInterval = parseInt(settings.get('slicer.speedDelay'));
    }
    else {
        sliceInterval = parseInt(times.on) + parseInt(times.off);
    }

    expectedSliceInterval = Date.now() + sliceInterval;
    slicesNumber = parseInt($slicerLayersValue.html());
    currentSliceNumber = 0;

    zipFile = null;
    zipFolder = null;
    SVGExport = null;
    PNGExport = null;

    if (settings.get('slicer.zip')) {
        zipFile = new JSZip();
        zipFolder = zipFile.folder('slices');
        zipFile.file('README.txt', 'Generated by SLAcer.js\r\nhttp://lautr3k.github.io/SLAcer.js/\r\n');
        zipFile.file('slacer.json', JSON.stringify({
            imageExtension: settings.get('slicer.png') ? 'png' : 'svg',
            imageDirectory: 'slices',
            screenWidth: settings.get('screen.width'),
            screenHeight: settings.get('screen.height'),
            screenSize: settings.get('screen.diagonal.size'),
            screenUnit: settings.get('screen.diagonal.unit'),
            layersNumber: slicesNumber,
            layersHeight: settings.get('slicer.layers.height') / 1000,     // mm
            exposureTime: parseInt(settings.get('slicer.light.on')),       // ms
            liftingSpeed: parseInt(settings.get('slicer.lifting.speed')),  // mm/min
            liftingHeight: parseInt(settings.get('slicer.lifting.height'))  // mm
        }, null, 2));
        SVGExport = settings.get('slicer.svg');
        PNGExport = settings.get('slicer.png');
    }

    slicesNumber && slice();
}

$zipButton.on('click', function () {
    if (zipFile) {
        let name = 'SLAcer';
        if (loadedFile && loadedFile.name) {
            name = loadedFile.name;
        }
        saveAs(zipFile.generate({ type: 'blob' }), name + '.zip');
    }
});

$sliceButton.on('click', function () {
    $sidebar.find('input, button').prop('disabled', true);
    $('.panel-heading button').prop('disabled', false);
    $openViewer2D.prop('disabled', false);
    $sliderInput.slider('disable');
    $abortButton.prop('disabled', false);
    $abortButton.removeClass('hidden');
    $sliceButton.addClass('hidden');
    startSlicing();
});

$abortButton.on('click', function () {
    currentSliceNumber = slicesNumber + 1;
    endSlicing();
});

$('#slicer-image-extension-' + (settings.get('slicer.png') ? 'png' : 'svg')).prop('checked', true);
$('#slicer-make-zip-' + (settings.get('slicer.zip') ? 'yes' : 'no')).prop('checked', true);
$('#slicer-speed-' + (settings.get('slicer.speed') ? 'yes' : 'no')).prop('checked', true);
$('#slicer input').on('input, change', updateSlicerSettings);
updateSlicerUI();

// Build volume panel
let $buildVolumeBody = initPanel('buildVolume');
let $buildVolumeX = $buildVolumeBody.find('#build-volume-x');
let $buildVolumeY = $buildVolumeBody.find('#build-volume-y');
let $buildVolumeZ = $buildVolumeBody.find('#build-volume-z');

function updateBuildVolumeUI() {
    let buildVolume = settings.get('buildVolume');

    $buildVolumeX.val(buildVolume.size.x);
    $buildVolumeY.val(buildVolume.size.y);
    $buildVolumeZ.val(buildVolume.size.z);

    updateBuildVolumeSizeStep();
}

function updateBuildVolumeSizeStep() {
    let step = (settings.get('buildVolume.unit') == 'in') ? 0.01 : 1;

    $buildVolumeX.prop('step', step);
    $buildVolumeY.prop('step', step);
    $buildVolumeZ.prop('step', step);
}

function updateBuildVolumeSettings() {
    let unit = $('#build-volume input[type=radio]:checked').val();

    if (unit != settings.get('buildVolume.unit')) {
        let size = settings.get('buildVolume.size');

        $buildVolumeX.val(parseUnit(size.x, unit));
        $buildVolumeY.val(parseUnit(size.y, unit));
        $buildVolumeZ.val(parseUnit(size.z, unit));
    }

    settings.set('buildVolume', {
        size: {
            x: $buildVolumeX.val(),
            y: $buildVolumeY.val(),
            z: $buildVolumeZ.val()
        },
        unit: unit
    });

    viewer3d.setBuildVolume(settings.get('buildVolume'));
    slicer.mesh && viewer3d.dropObject(slicer.mesh);
    viewer3d.render();

    updateMeshInfoUI();

    updateBuildVolumeSizeStep();
    getSlice($sliderInput.slider('getValue'));
}

$('#build-volume-unit-' + settings.get('buildVolume.unit')).prop('checked', true);
$('#build-volume input[type=radio]').on('change', updateBuildVolumeSettings);
$('#build-volume input').on('input', updateBuildVolumeSettings);
updateBuildVolumeUI();

// Resin panel
let $resinBody = initPanel('resin');
let $resinPrice = $resinBody.find('#resin-price');
let $resinDensity = $resinBody.find('#resin-density');

function updateResinUI() {
    let resin = settings.get('resin');

    $resinDensity.val(resin.density);
    $resinPrice.val(resin.price);
}

function updateResinSettings() {
    settings.set('resin.price', $resinPrice.val());
    settings.set('resin.density', $resinDensity.val());
    updateMeshInfoUI();
}

$('#resin input').on('input', updateResinSettings);
updateResinUI();

// Screen
let $screenBody = initPanel('screen');
let $screenWidth = $screenBody.find('#screen-width');
let $screenHeight = $screenBody.find('#screen-height');
let $screenDiagonalSize = $screenBody.find('#screen-diagonal-size');
let $screenDotPitch = $screenBody.find('#screen-dot-pitch');

function updateScreenUI() {
    let screen = settings.get('screen');

    $screenWidth.val(screen.width);
    $screenHeight.val(screen.height);
    $screenDiagonalSize.val(screen.diagonal.size);
    $screenDotPitch.html(viewer2d.dotPitch.toFixed(2));

    viewer2d.setScreenResolution(screen);
}

function updateScreenSettings() {
    let unit = $('#screen input[type=radio]:checked').val();

    if (unit != settings.get('screen.diagonal.unit')) {
        $screenDiagonalSize.val(
            parseUnit(settings.get('screen.diagonal.size'), unit)
        );
    }

    settings.set('screen', {
        width: $screenWidth.val(),
        height: $screenHeight.val(),
        diagonal: {
            size: $screenDiagonalSize.val(),
            unit: unit
        }
    });

    viewer2d.setScreenResolution(settings.get('screen'));
    $screenDotPitch.html(viewer2d.dotPitch.toFixed(2));

    getSlice($sliderInput.slider('getValue'));
}

$('#screen-diagonal-unit-' + settings.get('screen.diagonal.unit')).prop('checked', true);
$('#screen input[type=radio]').on('change', updateScreenSettings);
$('#screen input').on('input', updateScreenSettings);
updateScreenUI();

// Colors
let $colorsBody = initPanel('colors');
let $meshColor = $colorsBody.find('#mesh-color');
let $sliceColor = $colorsBody.find('#slice-color');

function updateColorsUI() {
    let colors = settings.get('colors');

    $meshColor.val(colors.mesh);
    $sliceColor.val(colors.slice);
}

updateColorsUI();
$meshColor.colorpicker({ format: 'hex' });
$sliceColor.colorpicker({ format: 'hex' });

$meshColor.colorpicker().on('changeColor.colorpicker', function (e) {
    if (slicer.mesh && slicer.mesh.material) {
        let hexString = e.color.toHex();
        let hexInteger = hexToDec(hexString);
        settings.set('colors.mesh', hexString);
        slicer.mesh.material.color.setHex(hexInteger);
        viewer3d.render();
    }
});

$sliceColor.colorpicker().on('changeColor.colorpicker', function (e) {
    if (shapes && shapes.length) {
        let hexString = e.color.toHex();
        let hexInteger = hexToDec(hexString);
        settings.set('colors.slice', hexString);
        for (let i = 0, il = shapes.length; i < il; i++) {
            shapes[i].material.color.setHex(hexInteger);
        }
        viewer3d.render();
    }
});

// Alert
// let $alertPanel = $('#alert');
// let $alertMessage = $alertPanel.find('.message');

// Transform
let $transformBody = initPanel('transform');
let $transformAction = $transformBody.find('#transform-action');
let $transformUniform = $transformBody.find('#transform-uniform');
let $transformX = $transformBody.find('#transform-x');
let $transformY = $transformBody.find('#transform-y');
let $transformZ = $transformBody.find('#transform-z');
let $transformButtons = $transformBody.find('button');

let $transformMirrorYes = $transformBody.find('#transform-mirror-yes');
let $transformMirrorNo = $transformBody.find('#transform-mirror-no');

let transformAction, transformations;

function resetTransformValues() {
    transformAction = 'scale';
    transformations = {
        scale: { x: 1, y: 1, z: 1 },
        rotate: { x: 0, y: 0, z: 0 },
        translate: { x: 0, y: 0, z: 0 }
    };
    updateTransformAction();
}

function updateTransformAction() {
    transformAction = $transformAction.val();

    let axis = transformations[transformAction];

    let min, max, step;

    if (transformAction == 'scale') {
        min = 0.01;
        max = 999;
        step = 0.01;
    }
    else if (transformAction == 'rotate') {
        min = 0;
        max = 360;
        step = 1;
    }
    else {
        min = -9999;
        max = 9999;
        step = 1;
    }

    $transformUniform.toggleClass('hidden', transformAction != 'scale');
    $transformZ.parent().toggleClass('hidden', transformAction == 'translate');

    $transformX.prop('min', min);
    $transformY.prop('min', min);
    $transformZ.prop('min', min);
    $transformX.prop('max', max);
    $transformY.prop('max', max);
    $transformZ.prop('max', max);
    $transformX.prop('step', step);
    $transformY.prop('step', step);
    $transformZ.prop('step', step);
    $transformX.val(axis.x);
    $transformY.val(axis.y);
    $transformZ.val(axis.z);
}

function updateTransformValues() {
    let current = transformations[transformAction];
    let uniform = $('#transform-uniform input[type=radio]:checked').val() == 'yes';
    let input = {
        x: parseFloat($transformX.val()),
        y: parseFloat($transformY.val()),
        z: parseFloat($transformZ.val())
    };

    input.x = isNaN(input.x) ? current.x : input.x;
    input.y = isNaN(input.y) ? current.y : input.y;
    input.z = isNaN(input.z) ? current.z : input.z;

    $transformX.val(input.x);
    $transformY.val(input.y);
    $transformZ.val(input.z);

    if (transformAction == 'scale') {
        if (uniform) {
            if (input.x != current.x) {
                let ratio = current.x / input.x;
                input.y = (current.y / ratio).toFixed(2);
                input.z = (current.z / ratio).toFixed(2);
                $transformY.val(input.y);
                $transformZ.val(input.z);
            }
            else if (input.y != current.y) {
                let ratio = current.y / input.y;
                input.x = (current.x / ratio).toFixed(2);
                input.z = (current.z / ratio).toFixed(2);
                $transformX.val(input.x);
                $transformZ.val(input.z);
            }
            else if (input.z != current.z) {
                let ratio = current.z / input.z;
                input.x = (current.x / ratio).toFixed(2);
                input.y = (current.y / ratio).toFixed(2);
                $transformX.val(input.x);
                $transformY.val(input.y);
            }
        }

        input.x <= 0 && (input.x = 1);
        input.y <= 0 && (input.y = 1);
        input.z <= 0 && (input.z = 1);

        slicer.mesh.geometry.scale(
            input.x / current.x,
            input.y / current.y,
            input.z / current.z
        );
    }
    else if (transformAction == 'rotate') {
        let deg = Math.PI / 180;
        let offsets = {
            x: input.x - current.x,
            y: input.y - current.y,
            z: input.z - current.z
        };

        slicer.mesh.geometry.rotateX(offsets.x * deg);
        slicer.mesh.geometry.rotateY(offsets.y * deg);
        slicer.mesh.geometry.rotateZ(offsets.z * deg);
    }
    else {
        let offsets = {
            x: input.x - current.x,
            y: input.y - current.y
        };

        slicer.mesh.geometry.translate(offsets.x, offsets.y, 0);
    }

    current.x = input.x;
    current.y = input.y;
    current.z = input.z;

    if (transformAction != 'translate') {
        loadGeometry(slicer.mesh.geometry, false);
        // stay at current position
        let current = transformations['translate'];
        slicer.mesh.geometry.translate(current.x, current.y, current.z);
    }

    getSlice($sliderInput.slider('getValue'));
}

$transformButtons.on('click', function () {
    let $this = $(this);
    let axis = $this.data('axis');
    let action = $this.data('action');
    let value = transformations[transformAction][axis];
    let $target = $transformBody.find('#transform-' + axis);

    $target.val(value + (action == '+' ? 1 : -1));
    updateTransformValues();
});

function flipGeometry() {
    settings.set('transform.mirror', $transformMirrorYes[0].checked);
    loadGeometry(slicer.mesh.geometry, true);
    getSlice($sliderInput.slider('getValue'));
}

$transformMirrorYes.on('change', flipGeometry);
$transformMirrorNo.on('change', flipGeometry);

$('#transform-mirror-' + (settings.get('transform.mirror') ? 'yes' : 'no')).prop('checked', true);
$('#transform select').on('change', updateTransformAction);
$('#transform input').on('change', updateTransformValues);
resetTransformValues();

// UI resize
function resizeUI() {
    let width = $main.width();
    let height = $main.height();
    $sliderElement.height(height - 80);
    viewer3d.setSize({ width: width, height: height });
    viewer3d.render();
}

$(window).resize(resizeUI);
resizeUI();

// -----------------------------------------------------------------------------
// STL loader
// -----------------------------------------------------------------------------
// Loader instance
let loader = new MeshesJS.STLLoader($main[0]); // drop target

// Load an geometry
function loadGeometry(geometry, mirror) {
    try {
        // remove old mesh and plane
        slicer.mesh && viewer3d.removeObject(slicer.mesh);

        // remove old shapes
        removeShapes();

        // flip geometry
        if (mirror) {
            geometry.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));
        }

        // load new mesh in slicer
        slicer.loadMesh(new SLAcer.Mesh(geometry, new THREE.MeshPhongMaterial({
            color: hexToDec(settings.get('colors.mesh')), side: THREE.DoubleSide
        })));

        // add new mesh and render view
        viewer3d.addObject(slicer.mesh);
        viewer3d.render();

        // update mesh info
        updateMeshInfoUI();

        // get first slice
        //getSlice(1);
    }
    catch (e) {
        errorHandler(e);
    }
}

// Haaaaaaaaaaaaaaaaaa!!!!
function ultraMegaDirtyFix() {
    $transformBody.find('#transform-x').val(1.1);
    $transformBody.find('#transform-y').val(1.1);
    $transformBody.find('#transform-z').val(1.1);
    updateTransformValues();
    $transformBody.find('#transform-x').val(1);
    $transformBody.find('#transform-y').val(1);
    $transformBody.find('#transform-z').val(1);
    updateTransformValues();
}

// On Geometry loaded
loader.onGeometry = function (geometry) {
    resetTransformValues();
    loadGeometry(geometry, settings.get('transform.mirror'));
    ultraMegaDirtyFix();
};

// On loading error
loader.onError = errorHandler;

// -----------------------------------------------------------------------------
// load example
// -----------------------------------------------------------------------------
// example STL file
//let stl = 'stl/Octocat-v2.stl';
let stl = 'stl/StressTest.stl';
//let stl = 'stl/SLAcer.stl';

// File url
// let url = 'http://' + window.location.hostname + window.location.pathname + stl;
let url = window.location.href + stl;

// Create http request object
let xmlhttp = new XMLHttpRequest();

// Get the file contents
xmlhttp.open('GET', url);

xmlhttp.onreadystatechange = function () {
    if (xmlhttp.readyState == XMLHttpRequest.DONE) {
        if (xmlhttp.status == 200) {
            loader.loadString(xmlhttp.responseText);
        } else {
            errorHandler('xmlhttp: ' + xmlhttp.statusText);
        }
    }
};

xmlhttp.send();


