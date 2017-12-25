/* global THREE, _ */

import {Viewer} from './viewer';
import {ViewControls} from './viewcontrols';
import {Mesh} from './mesh';

// global settings
let viewer3dGlobalSettings = {
    view: 'default',
    buildVolume: {
        size: {
            x: 100, // mm
            y: 100, // mm
            z: 100  // mm
        },
        color: 0xff0000,
        opacity: 0.1
    }
};

// -------------------------------------------------------------------------
export class Viewer3D extends Viewer {
    // Constructor
    constructor(settings) {
        super(settings);

        _.defaultsDeep(this.settings, Viewer3D.globalSettings);

        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        this.controls.addEventListener('change', () => {
            this.render();
        });
        this.controls.noKeys = true;

        this.light = new THREE.AmbientLight(0x000000);
        this.scene.add(this.light);

        this.setBuildVolume(this.settings.buildVolume);

        this.view = new ViewControls({
            target: this.buildVolumeObject,
            controls: this.controls,
            camera: this.camera,
            margin: 10
        });

        var lights = [];
        lights[0] = new THREE.PointLight(0xffffff, 1, 0);
        lights[1] = new THREE.PointLight(0xffffff, 1, 0);
        lights[2] = new THREE.PointLight(0xffffff, 1, 0);

        lights[0].position.set(0, 2000, 0);
        lights[1].position.set(1000, 2000, 1000);
        lights[2].position.set(-1000, -2000, -1000);

        this.scene.add(lights[0]);
        this.scene.add(lights[1]);
        this.scene.add(lights[2]);

        this.setView(this.settings.view);
        this.render();
    }

    // -------------------------------------------------------------------------

    dropObject(object) {
        var volume = this.buildVolume.size;
        var size = object.geometry.boundingBox.size();
        object.position.z = -((volume.z - size.z) / 2);
    }

    addObject(object) {
        // drop object on build plate
        this.dropObject(object);

        // call parent method
        super.addObject(object);
    }

    // -------------------------------------------------------------------------

    setBuildVolume(settings) {
        this.buildVolume = _.defaultsDeep({}, settings, this.buildVolume);

        var size = this.buildVolume.size;
        var unit = this.buildVolume.unit;
        var color = this.buildVolume.color;
        var opacity = this.buildVolume.opacity;

        if (unit == 'in') { // -> mm
            size.x *= 25.4;
            size.y *= 25.4;
            size.z *= 25.4;
        }

        var geometry = new THREE.CubeGeometry(size.x, size.y, size.z);
        var material = new THREE.MeshBasicMaterial({
            color: color,
            opacity: opacity,
            transparent: true
        });

        var buildVolumeObject = new Mesh(geometry, material);

        this.buildVolumeObject && this.removeObject(this.buildVolumeObject);
        this.buildVolumeObject = buildVolumeObject;
        this.scene.add(this.buildVolumeObject);

        if (!this.buildVolumeBox) {
            this.buildVolumeBox = new THREE.BoxHelper();
            this.buildVolumeBox.material.color.setHex(color);
            this.scene.add(this.buildVolumeBox);
        }

        this.buildVolumeBox.update(this.buildVolumeObject);
    }

    setView(view) {
        this.view.set(view !== undefined ? view : this.settings.view);
    }
}
// -------------------------------------------------------------------------

// global settings
Viewer3D.globalSettings = viewer3dGlobalSettings;
