
function setupEditorUI(canvas, gameSystem) {

    function getEventXY(evnt) {
        return {
            x:evnt.offsetX,
            y:evnt.offsetY };
    }
    
    var isDragging = false;
    var startPos = null;
    var prevPos = null;
    var selectedCell = null;
    canvas.addEventListener('mousedown', function (evnt) {
        isDragging = true;
        startPos = getEventXY(evnt);
        prevPos = startPos;
        selectedCell = gameSystem.canvasHitTestXY(startPos.x, startPos.y);
    });
    canvas.addEventListener('mousemove', function (evnt) {
        if (!isDragging) return;
        if (!selectedCell) return;
        var curPos = getEventXY(evnt);
        selectedCell.layout.x += (curPos.x - prevPos.x);
        selectedCell.layout.y += (curPos.y - prevPos.y);
        prevPos = curPos;
        gameSystem.redraw();
    });
    canvas.addEventListener('mouseup', function (evnt) {
        isDragging = false;
        selectedCell = null;
    });
}