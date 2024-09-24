

var FolderUtils = {

    DownloadText : function (path, callback) {
        var rawFile = new XMLHttpRequest();
        rawFile.overrideMimeType("application/json");
        rawFile.open("GET", path, true);
        rawFile.onreadystatechange = function() {
            if (rawFile.readyState === 4 && rawFile.status == "200") {
                callback(rawFile.responseText);
            }
        }
        rawFile.send(null);
    },

    ShellExecute : function (cmd,callback,cd="./") {
        if (!FolderUtils.IsLocalHost()) {
            alert("Not supported on web!");
            if (callback) callback(null);
            return;
        }
        var encoded = cmd.replace(" ","^");
        FolderUtils.DownloadText("shell_execute.php?cd=" + cd + "&cmd=" + encoded, callback);
    },


    ShellSaveToFile : function(path,content,callback,folderRoot="") {
        var url = folderRoot + "save_to_file.php?path=" + path;
        var rawFile = new XMLHttpRequest();
        rawFile.overrideMimeType("application/json");
        rawFile.open("POST", url, true);
        rawFile.onreadystatechange = function() {
            if (rawFile.readyState === 4 && rawFile.status == "200") {
                if (callback) {
                    callback(rawFile.responseText);
                }
            }
        }
        rawFile.send(content);
    },

};
