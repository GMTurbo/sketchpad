if (!Detector.webgl) Detector.addGetWebGLMessage();

var controlsProps = {
    objectType: 0,
    selectionType: 0
};

var container,
stats;

var camera,
scene,
renderer,
projector;

//for copying
var copyObj;

var DRAGGING = false;

var objects = [],
geometry,
plane,
clicks = [],
parent,
tmpRec;

var originalPos,
originalRot,
originalScl;

//UNDO / REDO Queues
var commandQueue = [],
undoQueue = [],
ACTION_TYPE = {
    add: "ADD",
    delete: "DELETE",
    rotate: "ROTATE",
    scale: "SCALE",
    move: "MOVE"
};

var mouse = new THREE.Vector2(),
offset = new THREE.Vector3(),
INTERSECTED,
SELECTED,
DRAG,
BRUSHTYPE = 'LINE',
CONTROLTYPE = 'MOVE',
radius = 50;

var foregroundColorSelector,
backgroundColorSelector,
menu,
COLOR = [0, 0, 0],
BACKGROUND_COLOR = [255, 255, 255],
palette,
STORAGE = window.localStorage,
//canvas,
//flattenCanvas,
BRUSHES = [
'Point',
'Line',
'Circle',
'Polygon',
'Rectangle'
],
CONTROLS = [
'Move',
'Scale',
'Warp',
'Rotate'
],
isFgColorSelectorVisible = false,
isBgColorSelectorVisible = false,
isAboutVisible = false,
isMenuMouseOver = false,
shiftKeyIsDown = false,
altKeyIsDown = false;
//var mouseX = 0, mouseY = 0;
var mesh,
initSpeed = 0;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
var lightS = {
    type: 'v3',
    value: new THREE.Vector3(1, 1, 0)
};

// var shaderMaterial = new THREE.MeshShaderMaterial({
// uniforms:       {
// color: {type: 'v3', value: new THREE.Vector3(1,0,1)},
// lightsource: lightS
// },
// vertexShader:   $('#vertpt').text(),
// fragmentShader: $('#fragpt').text()
// });
init();
animate();

function init() {
    if (isDnDSupported()) {
        // Great success! All the File APIs are supported.
        } else {
        alert('The File APIs are not fully supported in this browser.');
    }
    if (isLocalStorageSupported()) {
        // Great success! We can save now.
        } else {
        alert('Local Storage is not supported in this browser. :( ');
    }
    setupScene();
    showGUI();

    setupMenu();
}
var gui;

function showGUI(game) {
    gui = new DAT.GUI();
    DAT.GUI.autoPlace = true;

    $("#uiContainer").append(gui.domElement);

    gui.add(controlsProps, 'objectType').options({
        'Point': 0,
        'Line': 1,
        'Circle': 2,
        'Poly': 3,
        'Rect': 4
    }).onChange(function(newValue) {

        switch (newValue) {
        case 0:
            BRUSHTYPE = 'POINT';
            break;
        case 1:
            BRUSHTYPE = 'LINE';
            break;
        case 2:
            BRUSHTYPE = 'CIRCLE';
            break;
        case 3:
            BRUSHTYPE = 'POLYGON';
            break;
        case 4:
            BRUSHTYPE = 'RECTANGLE';
            break;
        default:
            BRUSHTYPE = 'POINT';
            break;
        }
    }).listen();

    gui.add(controlsProps, 'selectionType').options({
        'Move': 0,
        'Scale': 1,
        'Warp': 2,
        'Rotate': 3
    }).onChange(function(newValue) {

        switch (newValue) {
        case 0:
            CONTROLTYPE = 'MOVE';
            break;
        case 1:
            CONTROLTYPE = 'SCALE';
            break;
        case 2:
            CONTROLTYPE = 'WARP';
            break;
        case 3:
            CONTROLTYPE = 'ROTATE';
            break;
        default:
            CONTROLTYPE = 'MOVE';
            break;
        }
    }).listen();


    gui.add(this, 'onMenuSave').name('Save');
    // Specify a custom name.
    gui.add(this, 'onMenuLoad').name('Load');
    // Specify a custom name.
    gui.add(this, 'onMenuClear').name('Clear');
    // Specify a custom name.
    gui.autoListen = true;
    gui.close();
}
function setupMenu() {
    palette = new Palette();
    container.appendChild(renderer.domElement);
    foregroundColorSelector = new ColorSelector(palette);
    foregroundColorSelector.addEventListener('change', onForegroundColorSelectorChange, false);
    container.appendChild(foregroundColorSelector.container);

    //backgroundColorSelector = new ColorSelector(palette);
    //backgroundColorSelector.addEventListener('change', onBackgroundColorSelectorChange, false);
    //container.appendChild(backgroundColorSelector.container);
    menu = new Menu();
    menu.foregroundColor.addEventListener('click', onMenuForegroundColor, false);
    // menu.backgroundColor.addEventListener('click', onMenuBackgroundColor, false);
    menu.save.addEventListener('click', onMenuSave, false);
    menu.load.addEventListener('click', onMenuLoad, false)
    menu.clear.addEventListener('click', onMenuClear, false);
    menu.container.addEventListener('mouseover', onMenuMouseOver, false);
    menu.container.addEventListener('mouseout', onMenuMouseOut, false);
    container.appendChild(menu.container);
}
function setupScene() {
    container = document.createElement('div');
    document.body.appendChild(container);
    height = window.innerHeight;
    camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, height / 2, height / -2, 1, 1000);
    camera.position.set(0, 0, 800);
    scene = new THREE.Scene();
    parent = new THREE.Object3D();
    scene.add(parent);
    plane = new THREE.Mesh(new THREE.PlaneGeometry(2*window.innerWidth, 2*window.innerHeight, 2*8, 2*8), new THREE.MeshBasicMaterial({
        color: 0x000000,
        opacity: 0.50,
        transparent: true,
        wireframe: true
    }));

    plane.lookAt(camera.position);
    plane.visible = false;
    scene.add(plane)

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.sortObjects = false;
    projector = new THREE.Projector();

    renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);
    renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
    renderer.domElement.addEventListener('mouseup', onDocumentMouseUp, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);
}
function isLocalStorageSupported() {
    try {
        var supported = false;
        if (window['localStorage'] !== null)
        {
            supported = true;
        }
        return supported;
    } catch(e) {
        return false;
    }
}
function isDnDSupported() {
    return window.File && window.FileReader && window.FileList && window.Blob;
}
function getMaterial(color) {
    return new THREE.MeshBasicMaterial({
        color: color,
        shading: THREE.FlatShading
    });
}

function onMenuForegroundColor()
 {
    cleanPopUps();

    foregroundColorSelector.show();
    foregroundColorSelector.container.style.left = ((window.innerWidth - foregroundColorSelector.container.offsetWidth) / 2) + 'px';
    foregroundColorSelector.container.style.top = ((window.innerHeight - foregroundColorSelector.container.offsetHeight) / 2) + 'px';

    isFgColorSelectorVisible = true;
}

function onMenuBackgroundColor() {}

// COLOR SELECTORS
function onForegroundColorSelectorChange(event){
    if (SELECTED) {
        COLOR = foregroundColorSelector.getColor();
        COLOR = RGB2HTML(COLOR[0], COLOR[1], COLOR[2]);
        SELECTED.materials[0] = getMaterial(COLOR)
        setObjectData(SELECTED, 'color', COLOR);
    }
}
function onBackgroundColorSelectorChange(event) {}
function onMenuSave() {
    saveLocal();
}
function onMenuLoad() {
    loadLocal();
}
function saveLocal() {
    //localStorage.setItem('firstName', 'Bugs');
    var name = showPrompt(true);
    if (name === null) {
        return alert("invalid file name");
    } else {
        var saveData = prepForJSON(objects);
        var stringify = JSON.stringify(saveData);
        return localStorage.setItem(name, stringify);
    }
}
function loadLocal() {
    var name = showPrompt(false);
    if (name === null || localStorage.getItem(name) === null) {
        return alert("invalid file name");
    } else {
        onMenuClear();
        loadedObs = JSON.parse(localStorage.getItem(name));
        for (i = 0; i < loadedObs.length; i++) {
            loadObject(loadedObs[i]);
        }
    }
}
function print() {
    return window.open(renderer.domElement.toDataURL("image/png"), "SketchPad IMG");
}
function showPrompt(save) {
    var name;
    if (save) {
        name = prompt("Name your save file:");
    } else {
        name = prompt("Load filename:");
    }
    if (name !== null && name !== "") {
        return name;
    } else {
        return null;
    }
}
function prepForJSON(objectList) {
    ret = [];
    for (var index in objectList) {
        object = objectList[index];
        ret.push({
            geometry: object.ThreeType,
            vertices: object.vertices,
            position: object.position,
            rotation: object.rotation,
            scale: object.scale,
            color: object.color
        });
    }
    return ret;
}
function loadObject(object) {
    if (object === null || object === void 0) {} else {
        switch (object.geometry) {
        case "rectangle":
            return makeRectangle(object.vertices, object.color, object.position, object.scale, object.rotation);
        case "sphere":
            return makeSphere(object.vertices, object.color, object.position, object.scale, object.rotation);
        case "line":
            return makeLine(object.vertices, object.color, object.position, object.scale, object.rotation);
        case "point":
            return makeLine(object.vertices, object.color, object.position, object.scale, object.rotation);
        case "poly":
            return makePoly(object.vertices, object.color, object.position, object.scale, object.rotation)
        }
    }
}
function onMenuClear()
 {
    INTERSECTED = null;
    SELECTED = null;
    objects = [];
    commandQueue = [];
    undoQueue = [];
    scene = new THREE.Scene();
    parent = new THREE.Object3D();
    scene.add(parent);

    plane = new THREE.Mesh(new THREE.PlaneGeometry(window.innerWidth, window.innerHeight, 8, 8), new THREE.MeshBasicMaterial({
        color: 0x000000,
        opacity: 0.25,
        transparent: true,
        wireframe: true
    }));
    plane.lookAt(camera.position);
    plane.visible = false;
    scene.add(plane);

    render();
}
function onMenuMouseOver()
 {
    isMenuMouseOver = true;
}
function onMenuMouseOut()
 {
    isMenuMouseOver = false;
}
function onDocumentDragEnter(event)
 {
    event.stopPropagation();
    event.preventDefault();
}
function onDocumentDragOver(event)
 {
    event.stopPropagation();
    event.preventDefault();
}
function cleanPopUps()
 {
    gui.close();
    if (isFgColorSelectorVisible)
    {
        foregroundColorSelector.hide();
        isFgColorSelectorVisible = false;
    }

    if (isBgColorSelectorVisible)
    {
        backgroundColorSelector.hide();
        isBgColorSelectorVisible = false;
    }
}
function animate() {
    requestAnimationFrame(animate);
    //if(SELECTED && initSpeed > 0){
    //	initSpeed = getnewSpeed(initSpeed-0.1);
    //	SELECTED.rotation.z += initSpeed / (2*Math.PI);
    //}
    render();
}
function getnewSpeed(x) {
    return - 2 * x + 10;
}
function render() {
    renderer.render(scene, camera);
}

function setObjectData(object, property, value) {
    var index = objects.indexOf(object);
    if (index >= 0) {
        switch (property) {
        case 'color':
            objects[index].materials[0] = getMaterial(value);
            objects[index].color = objects[index].materials[0].color.getHex();
            return true;
            break;
        }
    }
    return false;
}
function getObject(object) {
    var index = objects.indexOf(object);
    if (index >= 0) {
        return objects[index];
    }
    return null;
}

function onDocumentMouseDown(event) {
    cleanPopUps();
    DRAGGING = true;
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    projector.unprojectVector(vector, camera);

    var ray = new THREE.Ray(camera.position, vector.subSelf(camera.position).normalize());

    var intersects = ray.intersectObjects(objects);

    if (intersects.length > 0) {

        SELECTED = intersects[0].object;
        //console.log("originalPos being set to DRAG.position");
        originalPos = new THREE.Vector3(SELECTED.position.x, SELECTED.position.y, SELECTED.position.z);
        originalRot = new THREE.Vector3(SELECTED.rotation.x, SELECTED.rotation.y, SELECTED.rotation.z);
        originalScl = new THREE.Vector3(SELECTED.scale.x, SELECTED.scale.y, SELECTED.scale.z);
        SELECTED.currentColor = SELECTED.materials[0].color.getHex();
        SELECTED.materials[0] = new THREE.MeshBasicMaterial({
            color: 0xf5894e
            //RED
        });
        var intersects = ray.intersectObject(plane);
        offset.copy(intersects[0].point).subSelf(plane.position);

        container.style.cursor = 'move';

    } else {
        if (SELECTED) {
            SELECTED.materials[0].color.getHex(getObject(SELECTED).color)
        }
        SELECTED = null;
        if (event.shiftKey) {
            var intersects = ray.intersectScene(scene);
            if (intersects[0].point)
            clicks.push(intersects[0].point);
        }
        else {
            clicks = [];
        }
    }

}
function onDocumentMouseMove(event) {

    event.preventDefault();
    //if(originalPos)
    //	console.log("originalPos= {" + originalPos.x +","+ originalPos.y+","+originalPos.z+"}");
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    projector.unprojectVector(vector, camera);

    var ray = new THREE.Ray(camera.position, vector.subSelf(camera.position).normalize());

    if (SELECTED && DRAGGING) {
        //console.log("dragging");
        action(ray);
        return;
    }

    var intersects = ray.intersectObjects(objects);

    if (intersects.length > 0) {

        if (INTERSECTED != intersects[0].object) {

            if (INTERSECTED) {
                INTERSECTED.materials[0].color.setHex(getObject(INTERSECTED).color);
            }

            INTERSECTED = intersects[0].object;
            var index = scene.objects.indexOf(INTERSECTED);
            plane.position.copy(INTERSECTED.position);

        }

        container.style.cursor = 'pointer';

    } else {

        if (INTERSECTED) {
            INTERSECTED.materials[0].color.setHex(getObject(INTERSECTED).color);
        }

        INTERSECTED = null;

        container.style.cursor = 'auto';

    }
   // if (event.shiftKey && clicks.length === 1 && BRUSHTYPE === 'RECTANGLE') {
   //     //begin drawing rectangle
    //    var color;
    //    var intersects = ray.intersectObject(plane);
    //    if (intersects[0].point)
   //     pnt = intersects[0].point;
   //     else
   //     return;
   //     var vec = new THREE.Vector3(clicks[0].x - pnt.x, clicks[0].y - pnt.y, clicks[0].z - pnt.z);
   //     if (tmpRec)
   //     parent.remove(tmpRec);
   //     tmpRec = new THREE.Mesh(new THREE.CubeGeometry(10 * Math.abs(vec.x), 10 * Math.abs(vec.y), 5), getMaterial(typeof tmpRec === "undefined" ? randColor() : tmpRec.color));
   //     parent.add(tmpRec);
   // }
    if (!event.shiftKey && clicks.length > 0) {
        createObject(ray);
        //if(tmpRec)
        //	scene.remove(tmpRec);
        clicks = [];
    }
    render();

}
function onDocumentMouseUp(event) {
    DRAGGING = false;
    event.preventDefault();

    if (INTERSECTED) {
        plane.position.copy(INTERSECTED.position);
        DRAG = null;
    }
    if (SELECTED) {
        addtoCommandList(SELECTED, CONTROLTYPE, originalPos, originalRot, originalScl);
    }

    container.style.cursor = 'auto';
}
// -------------------------- KEYBOARD EVENT HANDLERS  ------------------------------------------
function onDocumentKeyDown(event) {
    switch (String.fromCharCode(event.keyCode)) {
        //actions
    case "A":
        //a
        controlsProps.selectionType = 0;
        CONTROLTYPE = 'MOVE';
        swoosh('MOVE');
        break;
    case "S":
        //s
        controlsProps.selectionType = 1;
        CONTROLTYPE = 'SCALE';
        swoosh('SCALE');
        break;
    case "D":
        //d
        controlsProps.selectionType = 2;
        CONTROLTYPE = 'ROTATE';
        swoosh('ROTATE');
        break;
    case "F":
        //f
        controlsProps.selectionType = 2;
        CONTROLTYPE = 'WARP';
        swoosh('WARP');
        break;
        //objects
    case "1":
        //1
        controlsProps.objectType = 0;
        BRUSHTYPE = 'POINT';
        swoosh('POINT');
        break;
    case "2":
        //2
        controlsProps.objectType = 1;
        BRUSHTYPE = 'LINE';
        swoosh('LINE');
        break;
    case "3":
        //3
        controlsProps.objectType = 2;
        BRUSHTYPE = 'CIRCLE';
        swoosh('CIRCLE');
        break;
    case "4":
        //4
        controlsProps.objectType = 3;
        BRUSHTYPE = 'POLYGON';
        swoosh('POLYGON');
        break;
    case "5":
        //5
        controlsProps.objectType = 4;
        BRUSHTYPE = 'RECTANGLE';
        swoosh('RECTANGLE');
        break;
    case "Z":
        // undo
        if (event.ctrlKey) {
            if (undo())
            swoosh('UNDO');
        }
        break;
    case "Y":
        // redo
        if (event.ctrlKey) {
            if (redo())
            swoosh('REDO');
        }
        break;
    case "V":
        // paste
        if (event.ctrlKey) {
            paste();
            swoosh('PASTE');
        }
        break;
    case "C":
        // copy
        if (event.ctrlKey) {
            copy();
            swoosh('COPY');
        }
        break;
    case "X":
        //cut
        if (event.ctrlKey) {
            cut();
            swoosh('CUT');
        }
        break;
    case "P":
        //print
        if (event.ctrlKey) {
            print();
        }
    }
}
function action(ray) {
    switch (CONTROLTYPE) {
    case 'MOVE':
        DRAG = SELECTED;
        var intersects = ray.intersectObject(plane);
        DRAG.position.copy(intersects[0].point.subSelf(offset));
        break;
    case 'ROTATE':
        DRAG = SELECTED;
        //var intersects = ray.intersectObject(plane);
        //pnt = intersects[0].point;
        //direction = new THREE.Vector3(pnt.x - DRAG.position.x, 0, pnt.y - DRAG.position.y);
		direction = new THREE.Vector3(mouse.x - DRAG.position.x, 0, -mouse.y - DRAG.position.y);
		direction.normalize();
        DRAG.rotation.z = Math.atan(direction.x / direction.z);
        break;
    case 'SCALE':
        DRAG = SELECTED;
        var intersects = ray.intersectObject(plane);
        pnt = intersects[0].point;
        direction = new THREE.Vector3(pnt.x - DRAG.position.x, 0, pnt.y - DRAG.position.y);
        if (direction.length() > 0.1) {
            DRAG.scale = new THREE.Vector3(direction.length() / radius, direction.length() / radius, direction.length() / radius);
        }
        break;
    case 'WARP':
        break;
    }
}
function addtoCommandList(object, type, pos, rot, scl) {
    undoQueue = [];
    // you can no longer redo anything;
    commandQueue.push({
        object: object,
        type: type,
        position: pos,
        rotation: rot,
        scale: scl
    });
}
function undo() {
    if (commandQueue.length > 0) {
        var prevObject = commandQueue[commandQueue.length - 1];
        var cqIndex = commandQueue.indexOf(prevObject);
        // commandQueue index
        var oIndex = objects.indexOf(prevObject.object);
        // objects index
        switch (prevObject.type) {
        case "ADD":
            // object was added last time, so delete it
            undoFromScene(prevObject, commandQueue);
            prevObject.type = ACTION_TYPE.delete;
            // change type
            undoQueue.push(prevObject);
            // add it to undone queue
            render();
            break;
        case "DELETE":
            // object was deleted last time, so add it back
            commandQueue.splice(cqIndex, 1);
            prevObject.type = ACTION_TYPE.add;
            // change type
            undoQueue.push(prevObject);
            // add it to undone queue
            addToScene(prevObject.object, false);
            render();
            break;
        case "ROTATE":
            // object was rotated last time, so set rotation back to previous
            //console.log("oldRot= {" + prevObject.rotation.x + "," + prevObject.rotation.y + "," + prevObject.rotation.z + "}");
            //console.log("newRot= {" + objects[oIndex].rotation.x + "," + objects[oIndex].rotation.y + "," + objects[oIndex].rotation.z + "}");
            pos = prevObject.rotation;
            prevObject.rotation = objects[oIndex].rotation;
            undoFromScene(prevObject, commandQueue);
            prevObject.object.rotation = pos;
            // change type
            undoQueue.push(prevObject);
            // add it to undone queue
            addToScene(prevObject.object, false);
            break;
        case "MOVE":
            // object was moved last time, so set position back to previous
            //console.log("oldRot= {" + prevObject.position.x + "," + prevObject.position.y + "," + prevObject.position.z + "}");
            //console.log("newRot= {" + objects[oIndex].position.x + "," + objects[oIndex].position.y + "," + objects[oIndex].position.z + "}");
            pos = prevObject.position;
            prevObject.position = objects[oIndex].position;
            undoFromScene(prevObject, commandQueue);
            prevObject.object.position = pos;
            // change type
            undoQueue.push(prevObject);
            // add it to undone queue
            addToScene(prevObject.object, false);
            render();
            break;
        case "SCALE":
            // object was scaled last time, so set scale back to previous
            // change type
            // console.log("oldRot= {" + prevObject.scale.x + "," + prevObject.scale.y + "," + prevObject.scale.z + "}");
            // console.log("newRot= {" + objects[oIndex].scale.x + "," + objects[oIndex].scale.y + "," + objects[oIndex].scale.z + "}");
            pos = prevObject.scale;
            prevObject.scale = objects[oIndex].scale;
            undoFromScene(prevObject, commandQueue);
            prevObject.object.scale = pos;
            undoQueue.push(prevObject);
            // add it to undone queue
            addToScene(prevObject.object, false);
            render();
            break;
		case "COLOR":
			break;
        }
        return true;
    }
    return false;
}
function redo() {
    if (undoQueue.length > 0) {
        var prevObject = undoQueue[undoQueue.length - 1];
        var uqIndex = undoQueue.indexOf(prevObject);
        // commandQueue index
        var oIndex = objects.indexOf(prevObject.object);
        // objects index
        switch (prevObject.type) {
        case "ADD":
            // object was added last time, so delete it
            undoFromScene(prevObject, undoQueue);
            prevObject.type = ACTION_TYPE.delete;
            // change type
            commandQueue.push(prevObject);
            // add it to undone queue
            render();
            break;
        case "DELETE":
            // object was deleted last time, so add it back
            undoQueue.splice(uqIndex, 1);
            prevObject.type = ACTION_TYPE.add;
            // change type
            commandQueue.push(prevObject);
            // add it to undone queue
            addToScene(prevObject.object, false);
            render();
            break;
        case "ROTATE":
            // object was rotated last time, so set rotation back to previous
            pos = prevObject.rotation;
            prevObject.rotation = objects[oIndex].rotation;
            undoFromScene(prevObject, undoQueue);
            prevObject.object.rotation = pos;
            // change type
            commandQueue.push(prevObject);
            // add it to undone queue
            addToScene(prevObject.object, false);
            render();
            break;
        case "MOVE":
            // object was moved last time, so set position back to previous
            pos = prevObject.position;
            prevObject.position = objects[oIndex].position;
            undoFromScene(prevObject, undoQueue);
            prevObject.object.position = pos;
            // change type
            commandQueue.push(prevObject);
            // add it to undone queue
            addToScene(prevObject.object, false);
            render();
            break;
        case "SCALE":
            // object was scaled last time, so set scale back to normal
            pos = prevObject.scale;
            prevObject.scale = objects[oIndex].scale;
            undoFromScene(prevObject, undoQueue);
            prevObject.object.scale = pos;
            // change type
            commandQueue.push(prevObject);
            // add it to undone queue
            addToScene(prevObject.object, false);
            render();
            break;
        }
        return true;
    }
    return false;
}
function copy() {
    if (SELECTED) {
        copyObj = new THREE.Mesh(SELECTED.geometry, SELECTED.materials[0]);
        copyObj.rotation.copy(SELECTED.rotation);
        copyObj.scale.copy(SELECTED.scale);
        copyObj.position = new THREE.Vector3(0, 0, 0);
    }
}
function paste() {
    if (copyObj) {
        addToScene(copyObj);
    }
}
function cut() {
    if (SELECTED) {
        copyObj = SELECTED;
        copyObj.position = new THREE.Vector3(0, 0, 0);
        removeFromScene(SELECTED);
        INTERSECTED = null;
        SELECTED = null;
    }
}

// -------------------------- ADD/MAKE FUNCTIONS  ------------------------------------------
function addToScene(object, log) {
    if (typeof log === "undefined"){ addtoCommandList(object, ACTION_TYPE.add);}
    else if (log) {addtoCommandList(object, ACTION_TYPE.add);}
    objects.push(object);
    scene.add(object);
}
function undoFromScene(object, array) {
    var cqIndex = array.indexOf(object);
    // commandQueue index
    var oIndex = objects.indexOf(object.object);
    // objects index
    if (cqIndex !== -1) {
        array.splice(cqIndex, 1);
    }
    if (oIndex !== -1) {
        objects.splice(oIndex, 1);
    }
    scene.remove(object.object);
}
function removeFromScene(object) {
    var oIndex = objects.indexOf(object);
    // objects index
    if (oIndex !== -1) {
        objects.splice(oIndex, 1);
    }
    scene.remove(object);
}
function addSphere(points, color, position, scale, rotation) {
    geometry = new THREE.SphereGeometry(radius, 20, 20);
    mesh = new THREE.Mesh(geometry, getMaterial(color));
    mesh.overdraw = true;
    mesh.color = mesh.materials[0].color.getHex();
    if (typeof position !== "undefined") {
        mesh.position.copy(position);
    }
    if (typeof scale !== "undefined") {
        mesh.scale.copy(scale);
    }
    if (typeof rotation !== "undefined") {
        mesh.rotation.copy(rotation);
    }
    mesh.ThreeType = "sphere";
    mesh.vertices = clicks;
    addToScene(mesh);

}
function addLine(points, color, position, scale, rotation) {
    // solid line
    var line = new THREE.Line(points, new THREE.LineBasicMaterial({
        color: color,
        linewidth: 2
    }));
    line.updateMatrix();
    line.color = line.materials[0].color.getHex();
    if (typeof position !== "undefined") {
        line.position.copy(position);
    }
    if (typeof scale !== "undefined") {
        line.scale.copy(scale);
    }
    if (typeof rotation !== "undefined") {
        line.rotation.copy(rotation);
    }
    line.ThreeType = "line";
    line.vertices = clicks;
    addToScene(line);
}
function addMesh(geometry, color, position, scale, rotation) {
    var mesh = new THREE.Mesh(geometry, getMaterial(color));
    mesh.color = mesh.materials[0].color.getHex();
    if (typeof position !== "undefined") {
        mesh.position.copy(position);
    }
    if (typeof scale !== "undefined") {
        mesh.scale.copy(scale);
    }
    if (typeof rotation !== "undefined") {
        mesh.rotation.copy(rotation);
    }
    mesh.ThreeType = "poly";
    mesh.vertices = clicks;
    addToScene(mesh);
}
function addPoint(point, color, position, scale, rotation) {
    var geometry = new THREE.SphereGeometry(5, 5, 5);
    var p = new THREE.Mesh(geometry, getMaterial(color));
    p.position = point[0];
    if (typeof position !== "undefined") {
        p.position.copy(position);
    }
    if (typeof scale !== "undefined") {
        p.scale.copy(scale);
    }
    if (typeof rotation !== "undefined") {
        p.rotation.copy(rotation);
    }
    p.data = "unassigned";
    p.color = p.materials[0].color.getHex();
    p.ThreeType = "point";
    p.vertices = clicks;
    addToScene(p);
}
function addRectangle(points, color, position, scale, rotation) {
    var rec = GetRectangle(points);

    geometry = new THREE.CubeGeometry(rec.xlength, rec.ylength, 5);

    mesh = new THREE.Mesh(geometry, getMaterial(color));

    mesh.position = new THREE.Vector3(rec.x, rec.y, 0);

    if (typeof position !== "undefined") {
        mesh.position.copy(position);
    }
    if (typeof scale !== "undefined") {
        mesh.scale.copy(scale);
    }
    if (typeof rotation !== "undefined") {
        mesh.rotation.copy(rotation);
    }
    mesh.color = mesh.materials[0].color.getHex();
    mesh.ThreeType = "rectangle";
    mesh.vertices = clicks;
    addToScene(mesh);
}
function createObject(ray) {
    switch (BRUSHTYPE) {
    case 'LINE':
        if (clicks.length > 1) {
            makeLine(clicks, randColor());
        }
        break;
    case 'POINT':
        if (clicks.length === 1) {
            makePoint(clicks, randColor());
        }
        break;
    case 'CIRCLE':
        if (clicks.length === 1) {
            var intersects = ray.intersectObject(plane);
            center = intersects[0].point;
            makeSphere(clicks, randColor(), center);
        }
        break;
    case 'POLYGON':
        if (clicks.length > 3) {
            makePoly(clicks, randColor(), new THREE.Vector3(0, 0, 0));
        }
        break;
    case 'RECTANGLE':
        if (clicks.length > 1 && clicks.length < 5) {
            makeRectangle(clicks, randColor());
        }
        break;
    }
}
function randColor() {
    return Math.random() * 0xffffff;
}
function makeLine(points, color, position, scale, rotation) {
    geometry = new THREE.Geometry();
    for (var i in points) {
        geometry.vertices.push(new THREE.Vertex(points[i]));
    }
    addLine(geometry, color, position, scale, rotation);
}
function makePoly(points, color, position, scale, rotation) {
    var shape = new THREE.Shape(points);
    var extrude3d = new THREE.ExtrudeGeometry(shape, {
        amount: 5
    });
    addMesh(extrude3d, color, position, scale, rotation);
}
function makeSphere(points, color, position, scale, rotation) {
    addSphere(points, color, position, scale, rotation)
}
function makeRectangle(points, color, position, scale, rotation) {
    addRectangle(points, color, position, scale, rotation);
}
function makePoint(point, color, position, scale, rotation) {
    addPoint(clicks, color, position, scale, rotation);
}

//example I found. Not used in code
function addGeometry(geometry, points, spacedPoints, color, x, y, z, rx, ry, rz, s) {

    // 3d shape
    var mesh = new THREE.Mesh(geometry, [new THREE.MeshLambertMaterial({
        color: color
    }), new THREE.MeshBasicMaterial({
        color: 0x000000,
        wireframe: true
    })]);
    mesh.position.set(x, y, z - 75);
    mesh.rotation.set(rx, ry, rz);
    mesh.scale.set(s, s, s);
    objects.push(mesh);
    parent.add(mesh);

    // solid line
    var line = new THREE.Line(points, new THREE.LineBasicMaterial({
        color: color,
        linewidth: 2
    }));
    line.position.set(x, y, z + 25);
    line.rotation.set(rx, ry, rz);
    line.scale.set(s, s, s);
    parent.add(line);

    // transparent line from real points
    var line = new THREE.Line(points, new THREE.LineBasicMaterial({
        color: color,
        opacity: 0.5
    }));
    line.position.set(x, y, z + 75);
    line.rotation.set(rx, ry, rz);
    line.scale.set(s, s, s);
    parent.add(line);

    // vertices from real points
    var pgeo = THREE.GeometryUtils.clone(points);
    var particles = new THREE.ParticleSystem(pgeo, new THREE.ParticleBasicMaterial({
        color: color,
        size: 2,
        opacity: 0.75
    }));
    particles.position.set(x, y, z + 75);
    particles.rotation.set(rx, ry, rz);
    particles.scale.set(s, s, s);
    parent.add(particles);

    // transparent line from equidistance sampled points
    var line = new THREE.Line(spacedPoints, new THREE.LineBasicMaterial({
        color: color,
        opacity: 0.2
    }));
    line.position.set(x, y, z + 100);
    line.rotation.set(rx, ry, rz);
    line.scale.set(s, s, s);
    parent.add(line);

    // equidistance sampled points
    var pgeo = THREE.GeometryUtils.clone(spacedPoints);
    var particles2 = new THREE.ParticleSystem(pgeo, new THREE.ParticleBasicMaterial({
        color: color,
        size: 2,
        opacity: 0.5
    }));
    particles2.position.set(x, y, z + 100);
    particles2.rotation.set(rx, ry, rz);
    particles2.scale.set(s, s, s);
    parent.add(particles2);

}
function GetCenter(points) {
    var maxX = maxY = -1e6;
    var minX = minY = 1e6;

    for (var i in points) {
        if (points[i].x > maxX) {
            maxX = points[i].x;
        }
        if (points[i].x < minX) {
            minX = points[i].x;
        }
        if (points[i].y > maxY) {
            maxY = points[i].y;
        }
        if (points[i].y < minY) {
            minY = points[i].y;
        }
    }

    ret = {
        x: (maxX - minX) / 2.0,
        y: (maxY - minY) / 2.0,
    };
    return ret;
}
function GetRectangle(points) {
    var maxX = maxY = -1e6;
    var minX = minY = 1e6;

    for (var i in points) {
        if (points[i].x > maxX) {
            maxX = points[i].x;
        }
        if (points[i].x < minX) {
            minX = points[i].x;
        }
        if (points[i].y > maxY) {
            maxY = points[i].y;
        }
        if (points[i].y < minY) {
            minY = points[i].y;
        }
    }

    ret = {
        x: (maxX - minX) / 2.0,
        y: (maxY - minY) / 2.0,
        xlength: Math.abs(maxX - minX),
        ylength: Math.abs(maxY - minY)
    };
    return ret;
}