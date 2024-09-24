
function setupEditorUI(canvas, gameSystem) {

    function getEventXY(evnt) {
        var r = canvas.getBoundingClientRect();
        var s = (canvas.width / r.width);
        return {
            x:s * evnt.offsetX,
            y:s * evnt.offsetY };
    }
    
    var isDragging = false;
    var startPos = null;
    var prevPos = null;
    var selectedCell = null;
    var isRescaleMode = false;
    canvas.addEventListener('mousedown', function (evnt) {
        isDragging = true;
        startPos = getEventXY(evnt);
        prevPos = startPos;
        isRescaleMode = !(!evnt.shiftKey);
        selectedCell = gameSystem.canvasHitTestXY(startPos.x, startPos.y);
    });
    canvas.addEventListener('mousemove', function (evnt) {
        if (!isDragging) return;
        if (!selectedCell) return;
        var curPos = getEventXY(evnt);
        if (isRescaleMode) {
            selectedCell.layout.h += -(curPos.y - prevPos.y);
        } else {
            selectedCell.layout.x += (curPos.x - prevPos.x);
            selectedCell.layout.y += (curPos.y - prevPos.y);
        }
        prevPos = curPos;
        gameSystem.redraw();
    });
    canvas.addEventListener('mouseup', function (evnt) {
        isDragging = false;
        selectedCell = null;
    });
}