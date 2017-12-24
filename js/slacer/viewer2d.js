/* global THREE, _ */

// namespace
let SLAcer = SLAcer || {};

(function() {

    // global settings
    let globalSettings = {
        screen: {
            width   : 1680, // px
            height  : 1050, // px
            diagonal: { size: 22, unit: 'in' }
        },
        buildPlate: {
            size: {
                x: 100, // mm
                y: 100  // mm
            },
            unit: 'mm',
            color: 0xff0000,
            opacity: 0.1
        }
    };

    // -------------------------------------------------------------------------

    // Constructor
    function Viewer2D(settings) {
        SLAcer.Viewer.call(this, settings);
        _.defaultsDeep(this.settings, Viewer2D.globalSettings);
        this.setScreenResolution(this.settings.screen);
        this.setBuildPlate(this.settings.buildPlate);
        this.setView();
        this.render();
    }

    // extends
    Viewer2D.prototype = Object.create(SLAcer.Viewer.prototype);
    Viewer2D.prototype.constructor = Viewer2D;

    // -------------------------------------------------------------------------

    Viewer2D.prototype.updatePixelDensity = function() {
        let diagonalPixels     = Math.sqrt(Math.pow(this.screen.width, 2) + Math.pow(this.screen.height, 2));
        let pixelPerCentimeter = diagonalPixels / this.screen.diagonal.size * 10;

        if (this.screen.diagonal.unit == 'in') {
            pixelPerCentimeter = pixelPerCentimeter / 25.4;
        }

        this.dotPitch = 10 / pixelPerCentimeter;
    };

    Viewer2D.prototype.setScreenResolution = function(settings) {
        this.screen = _.defaultsDeep(settings, this.screen);
        this.updatePixelDensity();
        this.setSize(this.screen);
        this.setView();
    };

    Viewer2D.prototype.setBuildPlate = function(settings) {
        this.buildPlate = _.defaultsDeep(settings, this.buildPlate);

        let size    = this.buildPlate.size;
        let unit    = this.buildPlate.unit;
        let color   = this.buildPlate.color;
        let opacity = this.buildPlate.opacity;

        if (unit == 'in') { // -> mm
            size.x *= 25.4;
            size.y *= 25.4;
        }

        let geometry = new THREE.PlaneGeometry(size.x, size.y, 1);
        let material = new THREE.MeshBasicMaterial({
            color: color,
            opacity: opacity,
            transparent: true
        });

        let buildPlateObject = new THREE.Mesh(geometry, material);

        this.replaceObject(this.buildPlateObject, buildPlateObject);
        this.buildPlateObject = buildPlateObject;

        if (! this.buildPlateBox) {
            this.buildPlateBox = new THREE.BoxHelper();
            this.buildPlateBox.material.color.setHex(color);
            this.scene.add(this.buildPlateBox);
        }

        this.buildPlateBox.update(this.buildPlateObject);
    };

    Viewer2D.prototype.setView = function() {
        let distance = this.screen.height / 2;
        distance /= Math.tan(Math.PI * this.camera.fov / 360);
        distance *= this.dotPitch;

        this.camera.position.z = distance;
    };

    // -------------------------------------------------------------------------

    // global settings
    Viewer2D.globalSettings = globalSettings;

    // export module
    SLAcer.Viewer2D = Viewer2D;

})();
