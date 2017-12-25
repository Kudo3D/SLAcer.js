/* global THREE, _ */

// namespace
var SLAcer = SLAcer || {};


// global settings
let viewerGlobalSettings = {
    size: {
        width: 600,
        height: 400
    },
    color: 0x000000,
    antialias: true,
    target: document.body,
    camera: {
        fov: 45,
        near: 0.1,
        far: 10000,
    }
};

// -------------------------------------------------------------------------

class Viewer {
    // Constructor
    constructor(settings) {

        // settings settings
        this.settings = _.defaultsDeep({}, settings || {}, Viewer.globalSettings);

        // create main objects
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera();
        this.renderer = new THREE.WebGLRenderer({ antialias: this.settings.antialias });

        // assign camera settings
        _.assign(this.camera, this.settings.camera);

        // set camera orbit around Z axis
        this.camera.up = new THREE.Vector3(0, 0, 1);

        // set camera position
        this.camera.position.z = 1000;

        // set default parameters
        this.setSize(this.settings.size);
        this.setColor(this.settings.color);

        // set the target for canvas
        this.target = this.settings.target;
        this.canvas = this.renderer.domElement;
        if (this.target) {
            while (this.target.firstChild) {
                this.target.removeChild(this.target.firstChild);
            }
            this.target.appendChild(this.canvas);
        }

        // render
        this.render();
    }

    // -------------------------------------------------------------------------

    getSize () {
        return this.renderer.getSize();
    }

    setSize (size) {
        _.defaults(size, this.getSize());
        this.renderer.setSize(size.width, size.height);
        this.camera.aspect = size.width / size.height;
        this.camera.updateProjectionMatrix();
        return size;
    }

    setWidth (width) {
        return this.setSize({ width: width });
    }

    setHeight (height) {
        return this.setSize({ height: height });
    }

    // -------------------------------------------------------------------------

    getColor () {
        return this.renderer.getClearColor();
    }

    setColor (color) {
        this.renderer.setClearColor(color);
    }

    // -------------------------------------------------------------------------

    removeObject (object) {
        object.geometry && object.geometry.dispose();
        object.material && object.material.dispose();
        this.scene.remove(object);
    }

    addObject (object) {
        this.scene.add(object);
        return object;
    }

    replaceObject (oldObject, newObject) {
        oldObject && this.removeObject(oldObject);
        this.addObject(newObject);
        return newObject;
    }

    // -------------------------------------------------------------------------

    render () {
        this.renderer.render(this.scene, this.camera);
    }

    screenshot (callback) {
        this.render();
        callback(this.canvas.toDataURL());
    }
}
// -------------------------------------------------------------------------

// global settings
Viewer.globalSettings = viewerGlobalSettings;

// export module
SLAcer.Viewer = Viewer;

