/// <reference path="../node_modules/@types/jquery/index.d.ts" />
var DebugMode = false;
(function () {
    var oldConsoleLog = console.log, oldConsoleInfo = console.info;
    console.log = function (msg) {
        if (DebugMode) {
            return oldConsoleLog.apply(this, arguments);
        }
    };
    console.info = function (msg) {
        if (DebugMode) {
            return oldConsoleInfo.apply(this, arguments);
        }
    };
}());
var docInfoLocal = (function () {
    function docInfoLocal(doc) {
        this._id = doc._id;
        this._rev = doc._rev;
        this.htmlContent = doc.htmlContent;
        this.lastUserId = doc.lastUserId;
        this.clientId = doc.clientId;
    }
    return docInfoLocal;
}());
var actionsLocal;
(function (actionsLocal) {
    actionsLocal[actionsLocal["init"] = 0] = "init";
    actionsLocal[actionsLocal["create"] = 1] = "create";
    actionsLocal[actionsLocal["update"] = 2] = "update";
    actionsLocal[actionsLocal["move"] = 3] = "move";
    actionsLocal[actionsLocal["del"] = 4] = "del";
    actionsLocal[actionsLocal["img"] = 5] = "img";
    actionsLocal[actionsLocal["resize"] = 6] = "resize";
})(actionsLocal || (actionsLocal = {}));
var configinfo = (config) ? config : null;
var dbHost = configinfo.dbHost || 'http://10.16.133.104:5984/';
var dbName = configinfo.dbName || 'togetherboard_demo_db';
var localdb;
var remotedb;
//localdb = new PouchDB(dbName);
//remotedb = new PouchDB(`${dbHost}${dbName}`);
var flag = true;
var locLocal = {};
var infoLocal = null;
var toolflag = false;
var TogetherBoard = (function () {
    function TogetherBoard() {
    }
    TogetherBoard.prototype.addUserInfoToTitle = function () {
        return "title=\"Created User\uFF1A" + infoLocal.lastUserId + "\r\nLasted User\uFF1A" + infoLocal.lastUserId + "\"";
    };
    TogetherBoard.prototype.updateUserInfoToTitle = function (elementId, lastUserId) {
        if ($.trim(elementId)) {
            var $ele = $("#" + elementId);
            var t = /Lasted User：.+/g;
            var lastPattern = "Lasted User\uFF1A" + (lastUserId || infoLocal.lastUserId);
            if (t.test($ele.attr('title'))) {
                $ele.attr('title', $ele.attr('title').replace(t, lastPattern));
            }
            else {
                $ele.attr('title', lastPattern);
                this.addUserInfoToTitle;
            }
        }
    };
    TogetherBoard.prototype.guidLocal = function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return "tb-" + s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };
    TogetherBoard.prototype.endResize = function (e) {
        var $parent = $(e.target).parents('.resize-container');
        var src = $parent.find('img').attr('src');
        var id = $parent.attr('id');
        var updateInfo = {};
        if ($.trim(id)) {
            updateInfo = {
                action: actionsLocal.resize,
                elementId: id,
                imgSrc: src
            };
            console.info('endResize OnUpdateBoard');
            this.OnUpdateBoard(actionsLocal.resize, updateInfo);
        }
    };
    TogetherBoard.prototype.endMove = function (e) {
        var main = document.querySelector('.mainWhiteBoard');
        main.removeEventListener('mousemove', this.divMove, true);
        $('.moving .editBlockInput').focus();
        $('.moving').removeClass('moving');
        console.info('endmove');
        var id = "";
        var updateInfo = {};
        var $targetEle = $(e.target);
        if (e.target.tagName.toLowerCase() == "img") {
            $targetEle = $targetEle.parents('.resize-container');
        }
        id = $targetEle.attr('id');
        if ($.trim(id)) {
            updateInfo = {
                action: actionsLocal.move,
                elementId: id,
                styleInfo: {
                    left: $targetEle.css('left'),
                    top: $targetEle.css('top')
                }
            };
            console.info('move OnUpdateBoard');
            this.OnUpdateBoard(actionsLocal.move, updateInfo);
        }
    };
    TogetherBoard.prototype.beginMove = function (e, obj) {
        var main = document.querySelector('.mainWhiteBoard');
        locLocal.dx = e.clientX;
        locLocal.dy = e.clientY;
        locLocal.x = parseInt(obj.style.left.replace('px', ''));
        locLocal.y = parseInt(obj.style.top.replace('px', ''));
        if (isNaN(locLocal.x)) {
            locLocal.x = 0;
        }
        if (isNaN(locLocal.y)) {
            locLocal.y = 0;
        }
        main.addEventListener('mousemove', this.divMove, true);
        $(obj).addClass('moving');
        //console.log(e);
        //console.log("locx:" + loc.x + " locy:" + loc.y + " locdx:" + loc.dx + " locdy:" + loc.dy);
        console.info('beginMove');
    };
    TogetherBoard.prototype.divMove = function (e) {
        var item = $('.moving')[0];
        if (!item || !item.style) {
            return;
        }
        item.style.top = (e.clientY - locLocal.dy) + locLocal.y + 'px';
        item.style.left = (e.clientX - locLocal.dx) + locLocal.x + 'px';
        console.info('divMove');
    };
    TogetherBoard.prototype.cleanIfEmpty = function (e, obj) {
        $(obj).parent().removeClass('active');
        var objHtml = $(obj).html().trim();
        if ((objHtml == '<div></div>' || objHtml == '' || objHtml == '<br>') && !$(obj).parent().hasClass('moving')) {
            $(obj).parent().remove();
        }
        console.info('cleanIfEmpty');
    };
    TogetherBoard.prototype.setActive = function (e, obj) {
        //$('.active').find('.editBlockInput').blur()
        $('.active').removeClass('active');
        $(obj).parent().addClass('active');
        console.info('setActive');
    };
    TogetherBoard.prototype.AddNewBlock = function (e) {
        var divGuid = this.guidLocal();
        var divElement = "<div class=\"editBlock\" id='" + divGuid + "' " + this.addUserInfoToTitle() + ">\n                            <div></div>\n                            <div class=\"editBlockInput\" contenteditable ></div>\n                          </div>";
        var newBlock = $(divElement);
        newBlock.css('left', (e.offsetX - 5) + 'px').css('top', (e.offsetY - 5) + 'px');
        $('.mainWhiteBoard').append(newBlock);
        //http://swisnl.github.io/jQuery-contextMenu/demo/dynamic.html
        $(newBlock).find('.editBlockInput').focus();
        console.info('AddNewBlock');
    };
    TogetherBoard.prototype.OnUpdateBoard = function (action, updateInfo) {
        if (actionsLocal.del == action || actionsLocal.move == action || actionsLocal.resize == action) {
            this.UpdateDoc(updateInfo);
            return;
        }
        var data = "";
        this.SetText(updateInfo);
        if (actionsLocal.img !== updateInfo.action) {
            updateInfo.action = actionsLocal.update;
        }
        this.UpdateDoc(updateInfo);
    };
    TogetherBoard.prototype.UpdateDoc = function (updateinfo) {
        var tBoard = this;
        setTimeout(function () {
            if (flag) {
                tBoard.OnAddOrUpdateDoc(updateinfo);
            }
            else {
                tBoard.UpdateDoc(updateinfo);
            }
        }, 500);
    };
    TogetherBoard.prototype.OnAddOrUpdateDoc = function (updateinfo) {
        var _this = this;
        flag = false;
        if (!infoLocal) {
            console.log('Not found info data');
            return;
        }
        var _updateDoc = {
            _id: infoLocal._id,
            updateInfo: updateinfo,
            lastUserId: infoLocal.lastUserId,
            clientId: infoLocal.clientId,
            //todo sync htmlContent
            htmlContent: this.ReplaceHtmlClassName($('.mainWhiteBoard').html())
        };
        this.SetText(_updateDoc.updateInfo);
        //console.info('Step1');
        localdb.get(_updateDoc._id, function (err, doc) {
            _updateDoc._rev = doc._rev;
            //console.info('Step2 =>' + doc._rev);
            localdb.put(_updateDoc, function (err, response) {
                flag = true;
                //console.info('Step3 =>' + _updateDoc._rev);
                if (err) {
                    debugger;
                    return;
                }
                var infoDoc = _updateDoc;
                if (response.ok && response.rev) {
                    infoLocal._rev = response.rev;
                    _this.updateUserInfoToTitle(updateinfo.elementId);
                }
                console.info('OnAddOrUpdateDoc');
            });
        });
    };
    TogetherBoard.prototype.SetText = function (updateInfo) {
        //clear empty block
        $('.mainWhiteBoard .editBlock')
            .filter(function (e, b) { return $(b).html() == ''; })
            .remove();
        var $activeEle = $('.mainWhiteBoard').find("#" + updateInfo.elementId) || $('.mainWhiteBoard').find('.active');
        if (actionsLocal.img === updateInfo.action) {
            $activeEle = $('.resize-container').filter('.active');
        }
        if ($activeEle && $activeEle.length > 0) {
            updateInfo.elementContent = this.ReplaceHtmlClassName($activeEle.clone().wrap('<p/>').parent().html());
            updateInfo.elementId = updateInfo.elementId || $('.mainWhiteBoard').find('.active').attr('id');
            if (actionsLocal.img !== updateInfo.action) {
                updateInfo.text = $activeEle.find('.editBlockInput').html();
            }
        }
    };
    TogetherBoard.prototype.init = function (id) {
        if (!this.CreateLocalDb()) {
            return;
        }
        //clear local db
        //remotedb.replicate.to(localdb);
        remotedb.sync(localdb, {
            live: true,
            retry: true,
            doc_ids: [id],
            batch_size: 1000
        }).on('change', function (result) {
            $.each(result.change.docs, function (a, doc) {
                if (!infoLocal) {
                    return;
                }
                if (doc._id === infoLocal._id) {
                    infoLocal._rev = doc._rev;
                }
                if (doc._id === infoLocal._id
                    && (doc.lastUserId !== infoLocal.lastUserId
                        || (doc.lastUserId === infoLocal.lastUserId
                            && doc.clientId !== infoLocal.clientId))) {
                    console.info('onSyncChange');
                    var c_doc = doc;
                    tb.SyncChange(c_doc);
                }
            });
            //if (change.doc._deleted) {
            //    //todo restart?
            //}
            console.info('change');
            console.info(result);
            // handle change
        }).on('paused', function (err) {
            // replication paused (e.g. replication up to date, user went offline)
        }).on('active', function () {
            //setTimeout(function () {
            //    tb.RoomInitPonchdb(infoLocal._id, infoLocal.lastUserId);
            //}, 800);
            // replicate resumed (e.g. new changes replicating, user went back online)
        }).on('complete', function (info) {
            // handle complete
        }).on('error', function (err) {
            if (err.code.toLowerCase() != "etimedout") {
                DebugMode = true;
                console.error(err);
                alert(err);
            }
            window.location.reload();
        }).catch(tb.CatchErrorFnc);
    };
    TogetherBoard.prototype.CreateLocalDb = function (useLocalStorage) {
        if (useLocalStorage === void 0) { useLocalStorage = false; }
        try {
            if (useLocalStorage) {
                localdb = new PouchDB(dbName, { adapter: 'localstorage' });
            }
            else {
                localdb = new PouchDB(dbName);
            }
            remotedb = new PouchDB("" + dbHost + dbName);
            return true;
        }
        catch (err) {
            alert('No support this browser!!');
            return false;
        }
    };
    TogetherBoard.prototype.CreateDoc = function (options) {
        var doc = {
            _id: options._id || this.guidLocal(),
            _rev: options._rev,
            clientId: options.clientId || this.guidLocal(),
            htmlContent: $('.mainWhiteBoard').html(),
            lastUserId: options.lastUserId || 'system',
            updateInfo: options.updateInfo || '',
        };
        return new docInfoLocal(doc);
    };
    TogetherBoard.prototype.SendDoc = function (doc) {
        return localdb.put(doc);
    };
    TogetherBoard.prototype.GetRemoteDoc = function (id) {
        return remotedb.get(id, { conflicts: true });
    };
    TogetherBoard.prototype.DelDocById = function (id) {
        this.GetRemoteDoc(id).then(function (doc) {
            debugger;
            doc._deleted = true;
            return localdb.put(doc);
        });
    };
    TogetherBoard.prototype.SyncChange = function (doc, targetHtmlContent) {
        if (doc.updateInfo) {
            console.info('SyncChange');
            var updateinfo = doc.updateInfo;
            switch (doc.updateInfo.action) {
                case actionsLocal.init:
                    if ($.trim(doc.htmlContent)) {
                        $('.mainWhiteBoard').html(doc.htmlContent);
                    }
                    break;
                case actionsLocal.create:
                case actionsLocal.update:
                case actionsLocal.img:
                    if ((doc.updateInfo && $.trim(doc.updateInfo.elementContent))
                        || $.trim(updateinfo.elementId)) {
                        var $parentEle_1 = targetHtmlContent && targetHtmlContent.find("#" + updateinfo.elementId)
                            || $('.mainWhiteBoard').find("#" + updateinfo.elementId);
                        if ($parentEle_1 && $parentEle_1.length > 0) {
                            //let updateText = $.trim($('<div>').html(doc.htmlContent).find(`#${updateinfo.elementId}`).text());
                            //$parentEle.find('.editBlockInput').html(updateText);
                            $parentEle_1.find('.editBlockInput').html(updateinfo.text);
                            console.info("update action update");
                        }
                        else {
                            targetHtmlContent && targetHtmlContent.append(doc.updateInfo.elementContent)
                                || $('.mainWhiteBoard').append(doc.updateInfo.elementContent);
                            console.info("update action add");
                        }
                        if (actionsLocal.img) {
                            var $img = $("#" + updateinfo.elementId).find('img');
                            if ($img.length) {
                                new ResizeHelper($img.get(0)).init();
                            }
                        }
                        console.info("update id=>: " + updateinfo.elementId);
                    }
                    break;
                case actionsLocal.move:
                    if ($.trim(updateinfo.elementId) && $.trim(updateinfo.styleInfo)) {
                        var $parentEle = targetHtmlContent && targetHtmlContent.find("#" + updateinfo.elementId)
                            || $('.mainWhiteBoard').find("#" + updateinfo.elementId);
                        if ($parentEle && $parentEle.length > 0) {
                            $parentEle.css('left', updateinfo.styleInfo.left);
                            $parentEle.css('top', updateinfo.styleInfo.top);
                            console.info('move');
                        }
                        ;
                    }
                    break;
                case actionsLocal.del:
                    if ($.trim(updateinfo.elementId)) {
                        var $parentEle = targetHtmlContent && targetHtmlContent.find("#" + updateinfo.elementId) || $('.mainWhiteBoard').find("#" + updateinfo.elementId);
                        if ($parentEle && $parentEle.length > 0) {
                            $parentEle.remove();
                        }
                        ;
                    }
                    break;
                case actionsLocal.resize:
                    if ($.trim(updateinfo.elementId)) {
                        var $parentEle = targetHtmlContent && targetHtmlContent.find("#" + updateinfo.elementId) || $('.mainWhiteBoard').find("#" + updateinfo.elementId);
                        if ($parentEle && $parentEle.length > 0) {
                            var $img = $parentEle.find('img');
                            $img.attr('src', updateinfo.imgSrc);
                        }
                        ;
                    }
                    break;
            }
            this.updateUserInfoToTitle(updateinfo.elementId, doc.lastUserId);
        }
        else {
            console.info("SyncChange elese");
            console.info(doc);
        }
    };
    TogetherBoard.prototype.CatchErrorFnc = function (err) {
        if (!err) {
            return;
        }
        if (err.name === 'conflict') {
            debugger;
        }
        else {
            if (err.status == 404) {
                alert("Not found");
            }
            if (err.code == "ETIMEDOUT") {
                alert("Sync Fail !! Plz Reload");
            }
            console.error(err);
        }
    };
    TogetherBoard.prototype.ReplaceHtmlClassName = function (o) {
        if (o) {
            var relpaceInfo = o.replace(/class=".*(active)(?:"|[^\"]+")/g, function (a, b) {
                if (b === "active") {
                    return a.replace(b, "");
                }
                return a;
            });
            return relpaceInfo;
        }
    };
    TogetherBoard.prototype.RoomInitPonchdb = function (id, userid) {
        var _this = this;
        var tBoard = this;
        this.GetRemoteDoc(id).then(function (doc) {
            infoLocal = new docInfoLocal(doc);
            //set self info
            infoLocal.lastUserId = userid;
            infoLocal.clientId = tBoard.guidLocal();
            if (doc.htmlContent) {
                $('.mainWhiteBoard').html(doc.htmlContent);
                console.info("init get=>: " + doc.htmlContent);
                _this.OnInitResizeToImage();
            }
        }).catch(function (err) {
            if (err && err.status == 404) {
                var c = _this.CreateDoc({
                    lastUserId: userid
                });
                c._id = id || c._id;
                infoLocal = c;
                console.info("init send=>: " + c.htmlContent);
                _this.SendDoc(c).then(function (response) {
                    if (response.ok) {
                        infoLocal._rev = response.rev;
                        $('.mainWhiteBoard').html('');
                    }
                }).catch(function (err) {
                    alert('Create Fail');
                });
            }
        });
    };
    TogetherBoard.prototype.OnInitResizeToImage = function () {
        $.each($('.mainWhiteBoard').find('img'), function (i, s) {
            new ResizeHelper(s).init();
        });
    };
    TogetherBoard.prototype.onPasteTriggered = function (e) {
        var oldDivId = $(e.target).parent().attr('id');
        var newDivId;
        if (typeof e.clipboardData != 'undefined' && e.clipboardData.items) {
            var copiedData;
            // take first image
            for (var i = 0; i < e.clipboardData.items.length; i++) {
                copiedData = e.clipboardData.items[i]; //Get the clipboard data
                /*If the clipboard data is of type image, read the data*/
                if (copiedData.type.indexOf("image") == 0)
                    break;
            }
            if (copiedData && copiedData.type.indexOf("image") == 0) {
                var imageFile = copiedData.getAsFile();
                /*We will use HTML5 FileReader API to read the image file*/
                var reader = new FileReader();
                reader.onload = function (evt) {
                    var result = evt.target.result; //base64 encoded image
                    /*Create an image element and append it to the content editable div*/
                    //var box = document.createElement("div");
                    //box.className = "imgBlock";
                    //box.id = tb.guidLocal();
                    //newDivId = box.id;
                    //box.onmousedown = (e) => {
                    //    tb.beginMove(e, e.currentTarget);
                    //};
                    //box.blur = () => { };
                    var img = document.createElement("img");
                    img.src = result;
                    img.ondrag = function (e) {
                        return false;
                    };
                    var active = document.querySelector('.active');
                    var style = {
                        left: 0,
                        top: 0
                    };
                    if (active != null) {
                        //box.style.left = active.style.left;
                        //box.style.top = active.style.top;
                        style.left = active.style.left;
                        style.top = active.style.top;
                    }
                    newDivId = tb.guidLocal();
                    var resizeImg = $(img).wrap("<div " + tb.addUserInfoToTitle() + " class=\"resize-container\" id=\"" + newDivId + "\"></div>")
                        .before('<span class="resize-handle resize-handle-nw"></span>')
                        .before('<span class="resize-handle resize-handle-ne"></span>')
                        .after('<span class="resize-handle resize-handle-se"></span>')
                        .after('<span class="resize-handle resize-handle-sw"></span>');
                    resizeImg.parent().css('left', style.left);
                    resizeImg.parent().css('top', style.top);
                    //box.appendChild(img);
                    new ResizeHelper(img).init();
                    //document.querySelector('.mainWhiteBoard').appendChild(box);
                    document.querySelector('.mainWhiteBoard').appendChild(resizeImg.parent().get(0));
                    tb.setActive(null, img);
                };
                reader.onloadend = function (e) {
                    console.info('===>>>>>>>onloaded');
                    $("#" + oldDivId).find('.editBlockInput').focus().blur();
                    $("#" + newDivId).find('img').trigger("click");
                    console.info('onPasteTriggered OnUpdateBoard');
                    if ($("#" + oldDivId).find('.editBlockInput').length) {
                        $("#" + oldDivId).remove();
                    }
                    tb.OnUpdateBoard(actionsLocal.update, {
                        action: actionsLocal.img
                    });
                };
                /*Read the image file*/
                reader.readAsDataURL(imageFile);
            }
        }
        console.info('onPasteTriggered');
    };
    TogetherBoard.prototype.GetPositionInfo = function (element) {
        var $parent = $(element).parent();
        var pinfo = $parent.position();
        var tInfo;
        if (pinfo.top > 50) {
            tInfo = {
                x: pinfo.left,
                y: pinfo.top - 50
            };
        }
        else {
            var wt = $parent.outerHeight();
            if (pinfo.top > 0) {
                wt += pinfo.top;
            }
            tInfo = {
                x: pinfo.left,
                y: wt + 10
            };
        }
        return tInfo;
    };
    TogetherBoard.prototype.ShowTools = function (tinfo, isImg) {
        if (isImg === void 0) { isImg = false; }
        $('#tb-tools').show().css('transform', "translate(" + tinfo.x + "px, " + tinfo.y + "px)");
        if (isImg) {
            $('.tb-container-editoritem').hide();
        }
        else {
            $('.tb-container-editoritem').show();
        }
    };
    TogetherBoard.prototype.SetToolsTarget = function (element, elementId) {
        var id = elementId || $(element).parent().attr('id');
        $('#tb-tools').attr('data-target-id', '').attr('data-target-id', id);
    };
    TogetherBoard.prototype.GetSelectionHtml = function () {
        //http://stackoverflow.com/questions/6251937/how-to-replace-selected-text-with-html-in-a-contenteditable-element
        var html = "";
        var doc = document;
        if (typeof window.getSelection != "undefined") {
            var sel = window.getSelection();
            if (sel.rangeCount) {
                var container = document.createElement("div");
                for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                    container.appendChild(sel.getRangeAt(i).cloneContents());
                }
                html = container.innerHTML;
            }
        }
        else if (typeof doc.selection != "undefined") {
            if (doc.selection.type == "Text") {
                html = doc.selection.createRange().htmlText;
            }
        }
        return html;
    };
    return TogetherBoard;
}());
var DocEditor = (function () {
    function DocEditor() {
    }
    DocEditor.prototype.OnBold = function () {
        document.execCommand('bold', false, null);
    };
    DocEditor.prototype.OnForeColor = function (value) {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('forecolor', false, value);
    };
    DocEditor.prototype.OnBackColor = function (value) {
        document.execCommand('backColor', false, value);
    };
    DocEditor.prototype.OnUndo = function () {
        document.execCommand("undo");
    };
    DocEditor.prototype.OnRedo = function () {
        document.execCommand("redo");
    };
    DocEditor.prototype.OnFontSize = function (value) {
        //1~7
        document.execCommand("fontSize", false, value);
    };
    DocEditor.prototype.OnFontName = function (value) {
        document.execCommand("fontName", false, value);
    };
    DocEditor.prototype.OnFormatBlock = function (value) {
        document.execCommand("formatBlock", false, value);
    };
    DocEditor.prototype.OnUnSelect = function () {
        //firefox not work
        document.execCommand("Unselect");
    };
    return DocEditor;
}());
//http://tympanus.net/codrops/2014/10/30/resizing-cropping-images-canvas/
var ResizeHelper = (function () {
    function ResizeHelper(img_target) {
        var _this = this;
        this.event_state = {};
        this.constrain = false;
        this.orig_src = new Image();
        this.min_width = 60;
        this.min_height = 60;
        this.max_width = 800;
        this.max_height = 900;
        this.resize_canvas = document.createElement('canvas');
        //resize-container
        this.init = function () {
            _this.orig_src.src = _this.image_target.src;
            _this.$container = $(_this.image_target).parent('.resize-container');
            _this.$container.on('mousedown touchstart', '.resize-handle', _this.startResize);
            _this.$container.on('mousedown touchstart', 'img', _this.startMoving);
        };
        this.startResize = function (e) {
            e.preventDefault();
            e.stopPropagation();
            _this.saveEventState(e);
            $(document).on('mousemove touchmove', _this.resizing);
            $(document).on('mouseup touchend', _this.endResize);
        };
        this.startMoving = function (e) {
            e.preventDefault();
            e.stopPropagation();
            _this.saveEventState(e);
            $(document).on('mousemove touchmove', _this.moving);
            $(document).on('mouseup touchend', _this.endMoving);
        };
        this.resizing = function (e) {
            var mouse = {}, width, height, left, top, offset = _this.$container.offset();
            mouse.x = (e.clientX || e.pageX || e.originalEvent.touches[0].clientX) + $(window).scrollLeft();
            mouse.y = (e.clientY || e.pageY || e.originalEvent.touches[0].clientY) + $(window).scrollTop();
            // Position image differently depending on the corner dragged and constraints
            if ($(_this.event_state.evnt.target).hasClass('resize-handle-se')) {
                width = mouse.x - _this.event_state.container_left;
                height = mouse.y - _this.event_state.container_top;
                left = _this.event_state.container_left;
                top = _this.event_state.container_top;
            }
            else if ($(_this.event_state.evnt.target).hasClass('resize-handle-sw')) {
                width = _this.event_state.container_width - (mouse.x - _this.event_state.container_left);
                height = mouse.y - _this.event_state.container_top;
                left = mouse.x;
                top = _this.event_state.container_top;
            }
            else if ($(_this.event_state.evnt.target).hasClass('resize-handle-nw')) {
                width = _this.event_state.container_width - (mouse.x - _this.event_state.container_left);
                height = _this.event_state.container_height - (mouse.y - _this.event_state.container_top);
                left = mouse.x;
                top = mouse.y;
                if (_this.constrain || e.shiftKey) {
                    top = mouse.y - ((width / _this.orig_src.width * _this.orig_src.height) - height);
                }
            }
            else if ($(_this.event_state.evnt.target).hasClass('resize-handle-ne')) {
                width = mouse.x - _this.event_state.container_left;
                height = _this.event_state.container_height - (mouse.y - _this.event_state.container_top);
                left = _this.event_state.container_left;
                top = mouse.y;
                if (_this.constrain || e.shiftKey) {
                    top = mouse.y - ((width / _this.orig_src.width * _this.orig_src.height) - height);
                }
            }
            // Optionally maintain aspect ratio
            if (_this.constrain || e.shiftKey) {
                height = width / _this.orig_src.width * _this.orig_src.height;
            }
            if (width > _this.min_width && height > _this.min_height && width < _this.max_width && height < _this.max_height) {
                // To improve performance you might limit how often resizeImage() is called
                _this.resizeImage(width, height);
                // Without this Firefox will not re-calculate the the image dimensions until drag end
                _this.$container.offset({ 'left': left, 'top': top });
            }
        };
        this.resizeImage = function (width, height) {
            _this.resize_canvas.width = width;
            _this.resize_canvas.height = height;
            _this.resize_canvas.getContext('2d').drawImage(_this.orig_src, 0, 0, width, height);
            $(_this.image_target).attr('src', _this.resize_canvas.toDataURL("image/png"));
        };
        this.endResize = function (e) {
            e.preventDefault();
            $(document).off('mouseup touchend', _this.endResize);
            $(document).off('mousemove touchmove', _this.resizing);
            tb.endResize(e);
        };
        this.moving = function (e) {
            var mouse = {}, touches;
            e.preventDefault();
            e.stopPropagation();
            touches = e.originalEvent.touches;
            mouse.x = (e.clientX || e.pageX || touches[0].clientX) + $(window).scrollLeft();
            mouse.y = (e.clientY || e.pageY || touches[0].clientY) + $(window).scrollTop();
            _this.$container.offset({
                'left': mouse.x - (_this.event_state.mouse_x - _this.event_state.container_left),
                'top': mouse.y - (_this.event_state.mouse_y - _this.event_state.container_top)
            });
            // Watch for pinch zoom gesture while moving
            if (_this.event_state.touches && _this.event_state.touches.length > 1 && touches.length > 1) {
                var width = _this.event_state.container_width, height = _this.event_state.container_height;
                var a = _this.event_state.touches[0].clientX - _this.event_state.touches[1].clientX;
                a = a * a;
                var b = _this.event_state.touches[0].clientY - _this.event_state.touches[1].clientY;
                b = b * b;
                var dist1 = Math.sqrt(a + b);
                a = e.originalEvent.touches[0].clientX - touches[1].clientX;
                a = a * a;
                b = e.originalEvent.touches[0].clientY - touches[1].clientY;
                b = b * b;
                var dist2 = Math.sqrt(a + b);
                var ratio = dist2 / dist1;
                width = width * ratio;
                height = height * ratio;
                // To improve performance you might limit how often resizeImage() is called
                _this.resizeImage(width, height);
            }
        };
        this.endMoving = function (e) {
            e.preventDefault();
            $(document).off('mouseup touchend', _this.endMoving);
            $(document).off('mousemove touchmove', _this.moving);
            tb.endMove(e);
        };
        this.saveEventState = function (e) {
            // Save the initial event details and container state
            _this.event_state.container_width = _this.$container.width();
            _this.event_state.container_height = _this.$container.height();
            _this.event_state.container_left = _this.$container.offset().left;
            _this.event_state.container_top = _this.$container.offset().top;
            _this.event_state.mouse_x = (e.clientX || e.pageX || e.originalEvent.touches[0].clientX) + $(window).scrollLeft();
            _this.event_state.mouse_y = (e.clientY || e.pageY || e.originalEvent.touches[0].clientY) + $(window).scrollTop();
            // This is a fix for mobile safari
            // For some reason it does not allow a direct copy of the touches property
            if (typeof e.originalEvent.touches !== 'undefined') {
                _this.event_state.touches = [];
                $.each(e.originalEvent.touches, function (i, ob) {
                    this.event_state.touches[i] = {};
                    this.event_state.touches[i].clientX = 0 + ob.clientX;
                    this.event_state.touches[i].clientY = 0 + ob.clientY;
                });
            }
            _this.event_state.evnt = e;
        };
        this.image_target = img_target;
        this.$container = $(this.image_target).parent('.resize-container');
    }
    return ResizeHelper;
}());
var tb = new TogetherBoard();
var dEditor = new DocEditor();
$(document).ready(function () {
    $('.mainWhiteBoard').on('click', function (e) {
        tb.AddNewBlock(e);
    });
    $('.mainWhiteBoard').on('input', '.editBlockInput', function (e) {
        if ($(e.target).find('img').length) {
            return;
        }
        tb.OnUpdateBoard(actionsLocal.update, {
            action: actionsLocal.update,
            elementId: $(e.target).parent().attr('id')
        });
    });
    if (document.addEventListener) {
        document.addEventListener('paste', tb.onPasteTriggered, false);
    }
    $('.mainWhiteBoard')
        .on('click', '.imgBlock', function (e) {
        var tinfo = tb.GetPositionInfo(e.target);
        tb.ShowTools(tinfo, true);
        tb.setActive(null, e.target);
        tb.SetToolsTarget(e.target);
        e.stopPropagation();
    }).on('click', '.resize-container', function (e) {
        var tinfo = tb.GetPositionInfo(e.target);
        tb.ShowTools(tinfo, true);
        tb.setActive(null, e.target);
        $('.editBlockInput').blur();
        tb.SetToolsTarget(e.target);
        $('#tb-tools').show();
        e.stopPropagation();
    }).on('keyup', '.editBlockInput', function (e) {
        if (e.keyCode === 13 || e.keyCode === 8) {
            var tinfo = tb.GetPositionInfo(e.target);
            tb.ShowTools(tinfo);
            tb.SetToolsTarget(e.target);
        }
    }).on('click', '.editBlock', function (e) {
        e.stopPropagation();
    }).on('mousedown', '.editBlock', function (e) {
        tb.beginMove(e, e.currentTarget);
    }).on('blur', '.editBlockInput', function (e) {
        if (!toolflag) {
            tb.cleanIfEmpty(e, e.currentTarget);
        }
        toolflag = false;
        $('#tb-tools').hide();
        console.info('==>blur');
    }).on('focus', '.editBlockInput', function (e) {
        var tinfo = tb.GetPositionInfo(e.target);
        tb.ShowTools(tinfo);
        tb.SetToolsTarget(e.target);
        tb.setActive(e, e.currentTarget);
    }).on('mousedown', '.editBlockInput', function (e) {
        e.stopPropagation();
    });
    $('#tb-tools').find('a').mousedown(function (e) {
        console.info('tool');
        var action = $(e.currentTarget).attr('data-action');
        var elementId = $('#tb-tools').attr('data-target-id');
        var tagName;
        if (!elementId) {
            return;
        }
        switch (action) {
            case 'trash':
                if (elementId === 'mainWhiteBoard') {
                    break;
                }
                toolflag = true;
                $('#' + elementId).remove();
                tb.OnUpdateBoard(actionsLocal.del, {
                    action: actionsLocal.del,
                    elementId: elementId
                });
                $('#tb-tools').hide();
                break;
            case 'bold':
                dEditor.OnBold();
                break;
            case 'font-1':
            case 'font-2':
            case 'font-3':
            case 'font-4':
            case 'font-5':
            case 'font-6':
            case 'font-7':
                tagName = e.target.tagName.toLowerCase();
                var size = tagName == 'a' ? $(e.target).find('font').attr('size') : $(e.target).attr('size');
                dEditor.OnFontSize(size);
                break;
            case 'color-1':
            case 'color-2':
            case 'color-3':
            case 'color-4':
                tagName = e.target.tagName.toLowerCase();
                var color = tagName == 'a' ? $(e.target).find('span').css('color') : $(e.target).css('color');
                dEditor.OnForeColor(color);
                break;
            default:
                break;
        }
        //dEditor.OnUnSelect();
        e.preventDefault();
        return false;
    });
});
