
var gameUtils;
var gameSystem;

var gameUtils_prototype = {
    downloadJson : function(file, callback) {
        gameUtils.downloadText(file, (txt) => {
            var obj = JSON.parse(txt);
            callback(obj);
        });
    },
    downloadText : function(file, callback) {
        var rawFile = new XMLHttpRequest();
        rawFile.overrideMimeType("application/json");
        rawFile.open("GET", file, true);
        rawFile.onreadystatechange = function() {
            if (rawFile.readyState === 4 && rawFile.status == "200") {
                callback(rawFile.responseText);
            }
        }
        rawFile.send(null);
    },
};
gameUtils = new Object(gameUtils_prototype);

var vector2_prototype = {
    //x : 0,
    //y : 0,
    create : function(dx=0, dy=0) {
        var ans = Object.create(vector2_prototype);
        ans.x = dx;
        ans.y = dy;
        return ans;
    },
    clone : function() {
        var ans = this.create();
        ans.x = this.x;
        ans.y = this.y;
        return ans;
    },
    mined : function(other) {
        var ans = this.clone();
        ans.x = Math.min(this.x, other.x);
        ans.y = Math.min(this.y, other.y);
        return ans;
    },
    maxed : function(other) {
        var ans = this.clone();
        ans.x = Math.max(this.x, other.x);
        ans.y = Math.max(this.y, other.y);
        return ans;
    },
    subtracted : function(other) {
        var ans = this.clone();
        ans.x -= other.x;
        ans.y -= other.y;
        return ans;
    },
    added : function(other) {
        var ans = this.clone();
        ans.x += other.x;
        ans.y += other.y;
        return ans;
    }
};
var vector2 = new Object(vector2_prototype);

class ImageStore {
    constructor (game, path) {
        this.game = game;
        this.path = path;
        this.is_loaded = false;
        this.mask_background = null;
        this.mask_foreground = null;
        this.img = document.createElement("img");
        var _this = this;
        this.img.onload = (()=>{
            _this.is_loaded = true;
            _this.game.redraw();
        });
        this.img.src = path;

    }
    ensureMaskBackground() {
        if (!this.is_loaded) {
            return null;
        }
        if (this.mask_background) {
            return this.mask_background;
        }
        this.mask_background = document.createElement("canvas");
        this.convertImgToMaskInCanvas( this.img, this.mask_background );
        return this.mask_background;
    }
    convertImgToMaskInCanvas(img, canvas) {
        canvas.width = img.width;
        canvas.height = img.height;

        var ctx = canvas.getContext("2d");
        // Draw the image onto the canvas
        ctx.drawImage(img, 0, 0);

        // Get the image data from the canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Loop through each pixel and create the black and white mask
        for (let i = 0; i < data.length; i += 4) {
            // Check the alpha value of the pixel
            const alpha = data[i + 3]; // Alpha channel is the 4th value in each pixel (RGBA)

            // If the pixel has any alpha, set it to white, otherwise set it to black
            if (alpha > 0) {
                // Set the pixel to white (R, G, B, A)
                data[i] = 0;      // Red
                data[i + 1] = 0;  // Green
                data[i + 2] = 0;  // Blue
                data[i + 3] = 255;  // Full opacity
            } else {
                // Set the pixel to black
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
                data[i + 3] = 0;  // Full opacity
            }
        }

        // Put the modified image data back onto the canvas
        ctx.putImageData(imageData, 0, 0);
    }
}

var gameSystem_prototype = {
    game : null,
    scene : null,
    player : null,
    mainElement : null,
    mainStatus : null,
    drawMode : "main", // "fore" //"main", // "mask"

    initSystem(outElement, outStatus, outCanvas, rootPath="") {
        this.mainElement = outElement;
        this.mainStatus = outStatus;
        this.rootPath = rootPath;
        this.mainCanvas = outCanvas;

        var _this = this;
        gameUtils.downloadJson("../game/game.json", data => {
            if (!data) {
                main_status.innerText = "Failed Download.";
                return;
            }
            gameUtils.downloadJson("../game/layouts.json", levelData => {
                // merge jsons:
                for (var key in levelData) {
                    data[key] = levelData[key];
                }
                var layouts = levelData.layouts;
                for (var i in data.scenes) {
                    if (i < layouts.length) {
                        data.scenes[i].layout = layouts[i];
                    }
                }
                _this.initGame(data);
            });
        });
    },

    initGame : function(game) {
        this.game = game;
        this.canvasImages = {};

        // Init game data:
        for (var sceneIndex in game.scenes) {
            game.scenes[sceneIndex].info.index = 1*sceneIndex;
        }

        // Select scene:
        this.selectScene( game.scenes[1] );

        // Initial draw:
        this.redraw();
    },

    redraw : function() {
        var objects = this.scene.objects_by_id;
        var text = "";
        // First draw the lines between cells:
        for (var objId in objects) {
            var obj = objects[objId];
            if (obj.type == "cell") {
                for (var linkIndex in obj.links) {
                    var toId = obj.links[linkIndex];
                    var toCell = this.scene.objects_by_id[toId];
                    text += this.htmlForLineBetweenCells(obj, toCell);
                }
            }
        }
        // Then draw cells and other objects:
        var drawOrder = [ "cell", "item", "entity", "player" ];
        for (var drawPhase in drawOrder) {
            var drawType = drawOrder[drawPhase];
            for (var objId in objects) {
                var obj = objects[objId];
                if (obj.type != drawType) continue;
                text += this.htmlForObject(obj);
            }
        }
        this.mainElement.innerHTML = text;
        this.mainStatus.innerText = "" + this.scene.info.name + "...";
        if (this.mainCanvas) {
            this.redrawCanvas();
        }
    },

    sourceImageFor(obj) {
        var key = obj.type;
        //key = 'player';
        if ((this.drawMode == 'mask')
            || (this.drawMode == 'fore'))
        {
            //key = 'player';
        }
        if (key == 'entity') {
            key += "_" + obj.entityType;
        }
        if (key in this.canvasImages) {
            return this.canvasImages[key];
        }
        if (key in this.game.art) {
            var info = this.game.art[key];
            var path = this.rootPath + info.img;
            var store = new ImageStore(this, path);
            this.canvasImages[key] = store;
            return store;
        }
        console.log("Unknown key:", key);
    },

    canvasDrawObject(obj) {
        var cell = obj;
        if (true) {
            if (obj.state && obj.state.cell) {
                var objects = this.scene.objects_by_id;
                cell = objects[obj.state.cell];
            }
            var pos = cell.position;
            console.assert(pos);
            if (!cell.layout) {
                if (cell.id in this.scene.layout.layout_by_cell) {
                    cell.layout = this.scene.layout.layout_by_cell[cell.id];
                } else {
                    cell.layout = {};
                    const di_x = 0.75;
                    const di_y = 1.25;
                    cell.layout.x = (pos.x + di_x) * 220;
                    cell.layout.y = (pos.y + di_y) * 220;
                    cell.layout.h = 200;
                    this.scene.layout.layout_by_cell[cell.id] = cell.layout;
                }
            }
            // anything?
        }
        var store = this.sourceImageFor(obj);
        if ((!store) || (store.is_loaded == false)) {
            return; // no loaded yet
        }
        var img = null;
        if (this.drawMode == "mask") {
            img = store.ensureMaskBackground();
        } else {
            img = store.img;
        }
        var h = cell.layout.h;
        var w = (h / img.height) * img.width;
        var x = cell.layout.x - (w/2);
        var y = cell.layout.y - h;
        this.ctx.drawImage(img, x, y, w, h);
    },

    canvasHitTestXY(x,y) {
        var objects = this.scene.objects_by_id;
        for (var objId in objects) {
            var obj = objects[objId];
            if (obj.type != 'cell') {
                continue;
            }
            console.assert(obj.layout);
            var layout = obj.layout;
            if (y > layout.y) continue;
            if (y < (layout.y - layout.h)) continue;
            var w = layout.h / 2;
            if ((x < (layout.x - w))) continue;
            if ((x > (layout.x + w))) continue;
            return obj;
        }
        return null;
    },

    redrawCanvas : function() {
        var ctx = this.mainCanvas.getContext("2d");
        var w = this.mainCanvas.width;
        var h = this.mainCanvas.height;
        this.ctx = ctx;
        if (this.drawMode == "mask") {
            ctx.clearRect(0, 0, w, h);
        } else {
            ctx.fillStyle = '#D3D3D3';
            ctx.fillRect(0, 0, w, h);

            if (this.drawMode != "fore") {
                var bgImg = this.sourceImageFor( {type:"background"} );
                if (bgImg && bgImg.is_loaded) {
                    ctx.drawImage(bgImg.img, 0, 0);
                }
            }
        }
        

        var objects = this.scene.objects_by_id;
        var _this = this;

        function canvasDrawLineBetweenCells(cellA, cellB) {

        }

        // First draw the lines between cells:
        for (var objId in objects) {
            var obj = objects[objId];
            if (obj.type == "cell") {
                for (var linkIndex in obj.links) {
                    var toId = obj.links[linkIndex];
                    var toCell = this.scene.objects_by_id[toId];
                    canvasDrawLineBetweenCells(obj, toCell);
                }
            }
        }
        // Then draw cells and other objects:
        var drawOrder = [ "cell", "item", "entity", "player" ];
        for (var drawPhase in drawOrder) {
            var drawType = drawOrder[drawPhase];
            for (var objId in objects) {
                var obj = objects[objId];
                if (obj.type != drawType) continue;
                this.canvasDrawObject(obj);
            }
        }

        this.ctx = null; // good idea?
    },

    doInput : function(dirName) {
        if (dirName == "restart") {
            this.restartScene();
            this.redraw();
            return;
        }
        if (dirName.startsWith("scene")) {
            var ndx = this.scene.info.index;
            if (dirName == "scene++") {
                ndx++;
            } else {
                ndx--;
            }
            var n = this.game.scenes.length;
            ndx = ((ndx + n) % n);
            this.selectScene(this.game.scenes[ndx]);
            this.redraw();
            return;
        }
        var fromCellId = this.player.state.cell;
        var fromCell = this.scene.objects_by_id[fromCellId];
        if (dirName in fromCell.links) {
            var toCellId = fromCell.links[dirName];
            this.player.state.cell = toCellId;
            this.redraw();
        } else {
            this.mainStatus.innerText = "Can't walk that way.";
        }
    },

    selectScene : function(scene) {
        this.scene = scene;

        // Setup player:
        this.player = null;
        for (var objId in this.scene.objects_by_id) {
            var obj = this.scene.objects_by_id[objId];
            if (obj.type == "player") {
                this.player = obj;
                continue;
            }
        }
        console.assert(this.player);

        this.restartScene();
    },

    cloneGeneric : function(obj) {
        var txt = JSON.stringify(obj);
        return JSON.parse(txt);
    },

    restartScene : function() {
        for (var objId in this.scene.objects_by_id) {
            var obj = this.scene.objects_by_id[objId];

            if (obj.state) {
                if (!obj.init_state) {
                    obj.init_state = this.cloneGeneric(obj.state);
                }
                obj.state = this.cloneGeneric(obj.init_state);
            }
        }
    },

    sceneObjById : function(id) {
        if (id in this.scene.objects_by_id)
            return this.scene.objects_by_id[id];
        console.log("Not object " + id + " in " + this.scene.name);
        console.assert(false);
        return undefined;
    },

    htmlForLineBetweenCells : function(from, to, bgcolor=undefined) {
        var fromPos = this.cellCenter(from);
        var toPos = this.cellCenter(to);
        var low = fromPos.mined(toPos).subtracted(vector2.create(1,1));
        var high= fromPos.maxed(toPos).added(vector2.create(1,1));
        var size= high.subtracted(low);
        var ans = "<span style='position: absolute;"; //background-color: green; ";
        if (!bgcolor) {
            bgcolor = "blue";
        }
        ans += "background-color:" + bgcolor + ";";
        ans += "left: " + low.x + "px;";
        ans += "top:  " + low.y + "px;";
        ans += "width: " + size.x + "px;";
        ans += "height:" + size.y + "px;";
        ans += "' ></span>";
        return ans;
    },

    htmlForSprite : function(obj, cell) {
        var toPos = this.cellCenter(cell);
        toPos.x -= 8;
        toPos.y -= 8; // centering
        var path = "../content2d/Actor/Characters/GreenNinja/SpriteSheet.png";
        var ans = "<img ";
        ans += " src='" + path + "' ";

        var sprite = vector2.create(0,16);
        var size = vector2.create(16,16);

        ans += " style=\"position: absolute;";
        ans += "left: " + (toPos.x - sprite.x) + "px;";
        ans += "top:  " + (toPos.y - sprite.y) + "px;";
        
        ans += "clip:rect("; // rect (top, right, bottom, left)
        ans += (sprite.y) + "px, ";
        ans += (sprite.x + size.x) + "px, ";
        ans += (sprite.y + size.y) + "px, ";
        ans += (sprite.x) + "px ";
        ans += ");"

        ans += "\" ";

        ans += " />";
        return ans;
    },

    cellCenter : function(cell) {
        return vector2.create(
            (17 + (60 * cell.position.x)),
            (17 + (60 * cell.position.y)) );
    },
    
    htmlForObject : function(obj) {
        var colorByType = {
            "cell" : "lightblue",
            "entity" : "red",
            "item" : "blue",
            "player" : "green",
        };
        var ans = "<span style='position: absolute;"; //background-color: green; ";
        ans += "background-color:" + colorByType[obj.type] + ";";

        //ans += "left: 20px; top: 10px; width: 30px; height: 15px;' />";
        var cell = (obj.type == "cell") ? obj : this.sceneObjById( obj.state.cell );
        var cellPos = cell.position;

        ans += "left: " + (10 + (60 * cellPos.x)) + "px;";
        ans += "top:  " + (10 + (60 * cellPos.y)) + "px;";

        if (obj.type != "cell") {
            ans += "border-radius: 5px;";
        }
        ans += "width: 15px; height: 15px;";

        ans += "'>";
        if (obj.type == "entity") {
            ans += obj.entityType; // text direction
        }
        if (obj.type == "item") {   
            ans += obj.itemType; // text direction
        }
        ans += "</span>\n";
        if (obj.type == "entity") {
            if (obj.state.dir in cell.links) {
                var lookAtId = cell.links[obj.state.dir];
                var lookAtCell = this.scene.objects_by_id[lookAtId];
                ans += this.htmlForLineBetweenCells(cell, lookAtCell, "red");
            }
            ans += this.htmlForSprite(obj, cell);
        }

        return ans;
    }
};
gameSystem = new Object(gameSystem_prototype);

