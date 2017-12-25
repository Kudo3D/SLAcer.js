/* global THREE, _ */

// global settings
let viewControlsGlobalSettings = {
    view: 'default',
    target: null,
    controls: null,
    camera: null,
    margin: 10
};

export class ViewControls {

    // Constructor
    constructor(settings) {
        settings = _.defaults(settings || {}, ViewControls.globalSettings);

        this.view = null;
        this.defaultView = settings.view;
        this.controls = settings.controls;
        this.target = settings.target;
        this.camera = settings.camera;
        this.margin = settings.margin;
        this.focusPoint = new THREE.Object3D();

        this.update();
    }

    // methods
    update() {
        this.target.geometry.computeBoundingBox();
        this.setFocusAtCenter();
    }

    setFocusAt(point) {
        _.assign(this.focusPoint.position, point || {});
    }

    setFocusAtCenter() {
        this.setFocusAt({ x: 0, y: 0, z: 0 });
    }

    getVisibleDistance(width, height) {
        let margin = this.margin * 2;
        let size = height + margin;
        let aspect = width / height;

        // landscape or portrait orientation
        if (this.camera.aspect < aspect) {
            size = (width + margin) / this.camera.aspect;
        }

        return size / 2 / Math.tan(Math.PI * this.camera.fov / 360);
    }

    lookAtFocusPoint() {
        // set camera target to center of build volume
        this.controls.target = this.focusPoint.position.clone();
        this.controls.target0 = this.controls.target.clone();

        // update controls
        this.controls.update();
    }

    set(view) {
        // reset camera position
        this.controls.reset();

        // set new position
        let x = 0;
        let y = 0;
        let z = 0;
        let w, h;

        let size = this.target.geometry.boundingBox.size();
        view = view || this.defaultView;

        this.view = view;

        if (view == 'default' || view == 'front') {
            y = -size.y / 2;
            w = size.x;
            h = size.z;
        }
        else if (view == 'right') {
            x = size.x / 2;
            w = size.y;
            h = size.z;
        }
        else if (view == 'back') {
            y = size.y / 2;
            w = size.x;
            h = size.z;
        }
        else if (view == 'left') {
            x = -size.x / 2;
            w = size.y;
            h = size.z;
        }
        else if (view == 'top') {
            z = size.z / 2;
            w = size.x;
            h = size.y;
        }
        else if (view == 'bottom') {
            z = -size.z / 2;
            w = size.x;
            h = size.y;
        }

        // ensure the build volume is visible
        let distance = this.getVisibleDistance(w, h);

        if (view == 'default' || view == 'front') {
            y = y - distance;
        }
        else if (view == 'right') {
            x = x + distance;
        }
        else if (view == 'back') {
            y = y + distance;
        }
        else if (view == 'left') {
            x = x - distance;
        }
        else if (view == 'top') {
            z = z + distance;
        }
        else if (view == 'bottom') {
            z = z - distance;
        }

        // set default view
        if (view == 'default') {
            z = size.z / 2;
            x = size.x / 2;
        }

        // set new camera position
        this.camera.position.set(x, y, z);

        // set the camera look at focus point
        this.lookAtFocusPoint();
    }

}

// global settings
ViewControls.globalSettings = viewControlsGlobalSettings;
