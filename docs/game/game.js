
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

var gameSystem_prototype = {
    game : null,
    scene : null,
    player : null,
    mainElement : null,
    mainStatus : null,

    initGame : function(game, outElement, outStatus, outCanvas, rootPath="") {
        this.game = game;
        this.mainElement = outElement;
        this.mainStatus = outStatus;
        this.rootPath = rootPath;
        this.mainCanvas = outCanvas;
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
        var key = "player";// obj.type;
        if (key in this.canvasImages) {
            return this.canvasImages[key];
        }
        if (key in this.game.art) {
            var info = this.game.art[key];
            var path = this.rootPath + info.img;
            var img = document.createElement("img");
            this.canvasImages[key] = img;
            var _this = this;
            img.onload = (()=>{
                _this.redrawCanvas();
            });
            img.src = path;
            return img;
        }
        console.assert(false, "Unknown key:", key);
    },

    canvasDrawObject(obj) {
        if (!obj.layout) {
            var pos = obj.position;
            if (!pos) {
                if (obj.state && obj.state.cell) {
                    var objects = this.scene.objects_by_id;
                    var cell = objects[obj.state.cell];
                    pos = cell.position;
                }
            }
            console.assert(pos);
            obj.layout = {
                x: pos.x * 100, 
                y: pos.y * 100,
                h: 100,
            };
        }
        var img = this.sourceImageFor(obj);
        if (img.height == 0) {
            return; // no loaded yet
        }
        var h = obj.layout.h;
        var w = (h / img.height) * img.width;
        var x = obj.layout.x - (w/2);
        var y = obj.layout.y - h;
        this.ctx.drawImage(img, x, y, w, h);
    },

    redrawCanvas : function() {
        var ctx = this.mainCanvas.getContext("2d");
        var w = this.mainCanvas.width;
        var h = this.mainCanvas.height;
        this.ctx = ctx;
        ctx.fillStyle = '#D3D3D3';
        ctx.fillRect(0, 0, w, h);

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

