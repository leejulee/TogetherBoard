/// <reference path="../node_modules/@types/jquery/index.d.ts" />

declare var PouchDB: any;

declare var config: any;

let DebugMode = false;

(function () {
    var oldConsoleLog = console.log,
        oldConsoleInfo = console.info;
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
} ());

interface JQueryStatic {
    contextMenu(options: any): JQuery;
}

interface IdocLocal {
    _id: string;
    _rev: string;
    clientId: string;
    htmlContent: string;
    updateInfo: IUpdateInfoLocal;
    lastUserId: string;
}

class docInfoLocal implements IdocLocal {
    _id: string
    _rev: string
    clientId: string
    htmlContent: string
    updateInfo: IUpdateInfoLocal
    lastUserId: string
    constructor(doc: IdocLocal) {
        this._id = doc._id;
        this._rev = doc._rev;
        this.htmlContent = doc.htmlContent;
        this.lastUserId = doc.lastUserId;
        this.clientId = doc.clientId;
    }
}

interface IUpdateInfoLocal {
    id?: number;
    action: actionsLocal;
    styleInfo?: any;
    elementId: string;
    elementContent?: string;
    text?: string;
    contentmenuStyleInfo?: any;
    imgSrc?: string;
}

interface IEInfoLocal {
    id: string
    target: any
    isCheck: boolean
    count: number
}

enum actionsLocal {
    init = 0,
    create = 1,
    update = 2,
    move = 3,
    del = 4,
    img = 5,
    resize = 6
}
let configinfo = (config) ? config : null;
let dbHost = configinfo.dbHost || 'http://10.16.133.104:5984/';
let dbName = configinfo.dbName || 'togetherboard_demo_db';

let localdb;
let remotedb;
//localdb = new PouchDB(dbName);
//remotedb = new PouchDB(`${dbHost}${dbName}`);
let flag = true;
var locLocal: any = {};
let infoLocal: docInfoLocal = null;
let toolflag = false;

class TogetherBoard {

    addUserInfoToTitle() {
        return `title="Created User：${infoLocal.lastUserId}\r\nLasted User：${infoLocal.lastUserId}"`;
    }

    updateUserInfoToTitle(elementId, lastUserId?) {
        if ($.trim(elementId)) {
            let $ele = $(`#${elementId}`);
            let t = /Lasted User：.+/g;
            let lastPattern = `Lasted User：${lastUserId || infoLocal.lastUserId}`;
            if (t.test($ele.attr('title'))) {
                $ele.attr('title', $ele.attr('title').replace(t, lastPattern));
            } else {
                $ele.attr('title', lastPattern);
                this.addUserInfoToTitle
            }
        }
    }

    guidLocal() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return "tb-" + s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    endResize(e) {
        let $parent = $(e.target).parents('.resize-container');
        let src = $parent.find('img').attr('src');
        let id = $parent.attr('id');
        let updateInfo = {};

        if ($.trim(id)) {
            updateInfo = <IUpdateInfoLocal>{
                action: actionsLocal.resize,
                elementId: id,
                imgSrc: src
            };
            console.info('endResize OnUpdateBoard');
            this.OnUpdateBoard(actionsLocal.resize, <IUpdateInfoLocal>updateInfo)
        }
    }

    endMove(e) {
        var main = document.querySelector('.mainWhiteBoard');
        main.removeEventListener('mousemove', this.divMove, true);
        $('.moving .editBlockInput').focus();
        $('.moving').removeClass('moving');
        console.info('endmove')

        let id = "";
        let updateInfo = {};
        let $targetEle = $(e.target);

        if (e.target.tagName.toLowerCase() == "img") {
            $targetEle = $targetEle.parents('.resize-container');
        }

        id = $targetEle.attr('id');

        if ($.trim(id)) {
            updateInfo = <IUpdateInfoLocal>{
                action: actionsLocal.move,
                elementId: id,
                styleInfo: {
                    left: $targetEle.css('left'),
                    top: $targetEle.css('top')
                }
            };
            console.info('move OnUpdateBoard');
            this.OnUpdateBoard(actionsLocal.move, <IUpdateInfoLocal>updateInfo)
        }
    }

    beginMove(e, obj) {
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
        console.info('beginMove')
    }

    divMove(e) {
        var item = $('.moving')[0];
        if (!item || !item.style) {
            return;
        }
        item.style.top = (e.clientY - locLocal.dy) + locLocal.y + 'px';
        item.style.left = (e.clientX - locLocal.dx) + locLocal.x + 'px';
        console.info('divMove')
    }

    cleanIfEmpty(e, obj) {
        $(obj).parent().removeClass('active');
        let objHtml = $(obj).html().trim();
        if ((objHtml == '<div></div>' || objHtml == '' || objHtml == '<br>') && !$(obj).parent().hasClass('moving')) {
            $(obj).parent().remove();
        }
        console.info('cleanIfEmpty')
    }

    setActive(e, obj) {
        //$('.active').find('.editBlockInput').blur()
        $('.active').removeClass('active');
        $(obj).parent().addClass('active');
        console.info('setActive')
    }

    AddNewBlock(e) {
        let divGuid = this.guidLocal();
        let divElement = `<div class="editBlock" id='${divGuid}' ${this.addUserInfoToTitle()}>
                            <div></div>
                            <div class="editBlockInput" contenteditable ></div>
                          </div>`;

        var newBlock = $(divElement)
        newBlock.css('left', (e.offsetX - 5) + 'px').css('top', (e.offsetY - 5) + 'px');
        $('.mainWhiteBoard').append(newBlock);
        //http://swisnl.github.io/jQuery-contextMenu/demo/dynamic.html
        $(newBlock).find('.editBlockInput').focus()
        console.info('AddNewBlock')
    }

    OnUpdateBoard(action: actionsLocal, updateInfo?: IUpdateInfoLocal) {

        if (actionsLocal.del == action || actionsLocal.move == action || actionsLocal.resize == action) {
            this.UpdateDoc(updateInfo);
            return;
        }

        let data = "";

        this.SetText(updateInfo);

        if (actionsLocal.img !== updateInfo.action) {
            updateInfo.action = actionsLocal.update;
        }

        this.UpdateDoc(updateInfo);
    }

    UpdateDoc(updateinfo: IUpdateInfoLocal) {
        let tBoard = this;
        setTimeout(function () {
            if (flag) {
                tBoard.OnAddOrUpdateDoc(updateinfo)
            } else {
                tBoard.UpdateDoc(updateinfo)
            }
        }, 500);
    }

    OnAddOrUpdateDoc(updateinfo: IUpdateInfoLocal) {
        flag = false;
        if (!infoLocal) {
            console.log('Not found info data');
            return
        }

        let _updateDoc = <docInfoLocal>{
            _id: infoLocal._id,
            updateInfo: updateinfo,
            lastUserId: infoLocal.lastUserId,
            clientId: infoLocal.clientId,
            //todo sync htmlContent
            htmlContent: this.ReplaceHtmlClassName($('.mainWhiteBoard').html())
        }

        this.SetText(_updateDoc.updateInfo);

        //console.info('Step1');
        localdb.get(_updateDoc._id, (err, doc) => {
            _updateDoc._rev = doc._rev;
            //console.info('Step2 =>' + doc._rev);
            localdb.put(_updateDoc, (err, response) => {
                flag = true;
                //console.info('Step3 =>' + _updateDoc._rev);
                if (err) {
                    debugger
                    return
                }
                let infoDoc = _updateDoc;

                if (response.ok && response.rev) {
                    infoLocal._rev = response.rev;
                    this.updateUserInfoToTitle(updateinfo.elementId);
                }

                console.info('OnAddOrUpdateDoc');
            })
        })
    }

    SetText(updateInfo) {
        //clear empty block
        $('.mainWhiteBoard .editBlock')
            .filter(function (e, b) { return $(b).html() == '' })
            .remove();

        let $activeEle = $('.mainWhiteBoard').find(`#${updateInfo.elementId}`) || $('.mainWhiteBoard').find('.active');

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
    }

    init(id?) {
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
            $.each(result.change.docs, function (a, doc: docInfoLocal) {

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
                    let c_doc = <IdocLocal>doc;

                    tb.SyncChange(c_doc)
                }
            })

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
    }

    CreateLocalDb(useLocalStorage = false) {
        try {
            if (useLocalStorage) {
                localdb = new PouchDB(dbName, { adapter: 'localstorage' });
            } else {
                localdb = new PouchDB(dbName);
            }

            remotedb = new PouchDB(`${dbHost}${dbName}`);
            return true;
        } catch (err) {
            alert('No support this browser!!');
            return false;
        }
    }

    CreateDoc(options: docInfoLocal) {
        let doc = <docInfoLocal>{
            _id: options._id || this.guidLocal(),
            _rev: options._rev,
            clientId: options.clientId || this.guidLocal(),
            htmlContent: $('.mainWhiteBoard').html(),
            lastUserId: options.lastUserId || 'system',
            updateInfo: options.updateInfo || '',
        }
        return new docInfoLocal(doc);
    }

    SendDoc(doc) {
        return localdb.put(doc);
    }

    GetRemoteDoc(id) {
        return remotedb.get(id, { conflicts: true });
    }

    DelDocById(id) {
        this.GetRemoteDoc(id).then(function (doc) {
            debugger
            doc._deleted = true;
            return localdb.put(doc);
        });
    }

    SyncChange(doc, targetHtmlContent?) {
        if (doc.updateInfo) {
            console.info('SyncChange')
            let updateinfo = <IUpdateInfoLocal>doc.updateInfo;
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

                        let $parentEle = targetHtmlContent && targetHtmlContent.find(`#${updateinfo.elementId}`)
                            || $('.mainWhiteBoard').find(`#${updateinfo.elementId}`);
                        if ($parentEle && $parentEle.length > 0) {
                            //let updateText = $.trim($('<div>').html(doc.htmlContent).find(`#${updateinfo.elementId}`).text());
                            //$parentEle.find('.editBlockInput').html(updateText);
                            $parentEle.find('.editBlockInput').html(updateinfo.text);
                            console.info(`update action update`);
                        } else {
                            targetHtmlContent && targetHtmlContent.append(doc.updateInfo.elementContent)
                                || $('.mainWhiteBoard').append(doc.updateInfo.elementContent)
                            console.info(`update action add`);
                        }

                        if (actionsLocal.img) {
                            let $img = $(`#${updateinfo.elementId}`).find('img');
                            if ($img.length) {
                                new ResizeHelper($img.get(0)).init()
                            }
                        }

                        console.info(`update id=>: ${updateinfo.elementId}`);
                    }
                    break;
                case actionsLocal.move:
                    if ($.trim(updateinfo.elementId) && $.trim(updateinfo.styleInfo)) {
                        var $parentEle = targetHtmlContent && targetHtmlContent.find(`#${updateinfo.elementId}`)
                            || $('.mainWhiteBoard').find(`#${updateinfo.elementId}`);
                        if ($parentEle && $parentEle.length > 0) {
                            $parentEle.css('left', updateinfo.styleInfo.left);
                            $parentEle.css('top', updateinfo.styleInfo.top);
                            console.info('move')
                        };
                    }
                    break;
                case actionsLocal.del:
                    if ($.trim(updateinfo.elementId)) {
                        var $parentEle = targetHtmlContent && targetHtmlContent.find(`#${updateinfo.elementId}`) || $('.mainWhiteBoard').find(`#${updateinfo.elementId}`);
                        if ($parentEle && $parentEle.length > 0) {
                            $parentEle.remove();
                        };
                    }
                    break;
                case actionsLocal.resize:
                    if ($.trim(updateinfo.elementId)) {
                        var $parentEle = targetHtmlContent && targetHtmlContent.find(`#${updateinfo.elementId}`) || $('.mainWhiteBoard').find(`#${updateinfo.elementId}`);
                        if ($parentEle && $parentEle.length > 0) {
                            let $img = $parentEle.find('img');
                            $img.attr('src', updateinfo.imgSrc);
                        };
                    }
                    break;
            }
            this.updateUserInfoToTitle(updateinfo.elementId, doc.lastUserId);
            //Todo tb.SetToolsTarget(e.target);
        } else {
            console.info("SyncChange elese")
            console.info(doc)
        }
    }

    CatchErrorFnc(err) {
        if (!err) {
            return;
        }
        if (err.name === 'conflict') {
            debugger;
        } else {
            if (err.status == 404) {
                alert("Not found");
            }
            if (err.code == "ETIMEDOUT") {
                alert("Sync Fail !! Plz Reload");
            }
            console.error(err);
        }
    }

    ReplaceHtmlClassName(o: string) {
        if (o) {
            let relpaceInfo = o.replace(/class=".*(active)(?:"|[^\"]+")/g,
                (a, b) => {
                    if (b === "active") {
                        return a.replace(b, "");
                    }
                    return a;
                })

            return relpaceInfo;
        }
    }

    RoomInitPonchdb(id, userid) {
        let tBoard = this;
        this.GetRemoteDoc(id).then((doc) => {
            infoLocal = new docInfoLocal(doc);
            //set self info
            infoLocal.lastUserId = userid;
            infoLocal.clientId = tBoard.guidLocal();
            if (doc.htmlContent) {
                $('.mainWhiteBoard').html(doc.htmlContent);
                console.info(`init get=>: ${doc.htmlContent}`)
                this.OnInitResizeToImage();
            }
        }).catch((err) => {
            if (err && err.status == 404) {
                let c = this.CreateDoc(<docInfoLocal>{
                    lastUserId: userid
                });
                c._id = id || c._id;
                infoLocal = c;
                console.info(`init send=>: ${c.htmlContent}`)
                this.SendDoc(c).then((response) => {
                    if (response.ok) {
                        infoLocal._rev = response.rev;
                        $('.mainWhiteBoard').html('');
                    }
                }).catch(function (err) {
                    alert('Create Fail');
                });
            }
        })
    }

    OnInitResizeToImage() {
        $.each($('.mainWhiteBoard').find('img'), (i, s) => {
            new ResizeHelper(s).init();
        })
    }

    onPasteTriggered(e) {
        let oldDivId = $(e.target).parent().attr('id');
        let newDivId;
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
                reader.onload = (evt: any) => {
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
                    img.ondrag = (e) => {
                        return false;
                    };

                    var active: any = document.querySelector('.active');

                    let style = {
                        left: 0,
                        top: 0
                    }

                    if (active != null) {
                        //box.style.left = active.style.left;
                        //box.style.top = active.style.top;
                        style.left = active.style.left;
                        style.top = active.style.top;
                    }

                    newDivId = tb.guidLocal();

                    let resizeImg = $(img).wrap(`<div ${tb.addUserInfoToTitle()} class="resize-container" id="${newDivId}"></div>`)
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
                    console.info('===>>>>>>>onloaded')
                    $(`#${oldDivId}`).find('.editBlockInput').focus().blur();
                    $(`#${newDivId}`).find('img').trigger("click");
                    console.info('onPasteTriggered OnUpdateBoard');
                    if ($(`#${oldDivId}`).find('.editBlockInput').length) {
                        $(`#${oldDivId}`).remove();
                    }
                    tb.OnUpdateBoard(actionsLocal.update, <IUpdateInfoLocal>{
                        action: actionsLocal.img
                    });
                }
                /*Read the image file*/
                reader.readAsDataURL(imageFile);
            }
        }
        console.info('onPasteTriggered')
    }

    GetPositionInfo(element) {
        let $parent = $(element).parent();
        let pinfo = $parent.position();
        let tInfo;
        if (pinfo.top > 50) {
            tInfo = {
                x: pinfo.left,
                y: pinfo.top - 50
            };
        } else {
            let wt = $parent.outerHeight();
            if (pinfo.top > 0) {
                wt += pinfo.top;
            }
            tInfo = {
                x: pinfo.left,
                y: wt + 10
            };
        }

        return tInfo;
    }

    ShowTools(tinfo: any, isImg = false) {
        $('#tb-tools').show().css('transform', `translate(${tinfo.x}px, ${tinfo.y}px)`);
        if (isImg) {
            $('.tb-container-editoritem').hide();
        } else {
            $('.tb-container-editoritem').show();
        }
    }

    SetToolsTarget(element, elementId?) {
        let id = elementId || $(element).parent().attr('id');
        $('#tb-tools').attr('data-target-id', '').attr('data-target-id', id);
    }

    GetSelectionHtml() {
        //http://stackoverflow.com/questions/6251937/how-to-replace-selected-text-with-html-in-a-contenteditable-element
        var html = "";
        let doc: any = document;
        if (typeof window.getSelection != "undefined") {
            var sel = window.getSelection();
            if (sel.rangeCount) {
                var container = document.createElement("div");
                for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                    container.appendChild(sel.getRangeAt(i).cloneContents());
                }
                html = container.innerHTML;
            }
        } else if (typeof doc.selection != "undefined") {
            if (doc.selection.type == "Text") {
                html = doc.selection.createRange().htmlText;
            }
        }
        return html;
    }
}

class DocEditor {

    OnBold() {
        document.execCommand('bold', false, null);
    }

    OnForeColor(value) {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('forecolor', false, value);
    }

    OnBackColor(value) {
        document.execCommand('backColor', false, value);
    }

    OnUndo() {
        document.execCommand("undo");
    }

    OnRedo() {
        document.execCommand("redo");
    }

    OnFontSize(value) {
        //1~7
        document.execCommand("fontSize", false, value);
    }

    OnFontName(value) {
        document.execCommand("fontName", false, value);
    }

    OnFormatBlock(value) {
        document.execCommand("formatBlock", false, value);
    }

    OnUnSelect() {
        //firefox not work
        document.execCommand("Unselect");
    }
}

//http://tympanus.net/codrops/2014/10/30/resizing-cropping-images-canvas/
class ResizeHelper {
    $container: any;
    image_target: any;
    event_state: any = {};
    constrain = false;
    orig_src = new Image();
    min_width = 60;
    min_height = 60;
    max_width = 800;
    max_height = 900;
    resize_canvas = document.createElement('canvas');

    constructor(img_target) {
        this.image_target = img_target;
        this.$container = $(this.image_target).parent('.resize-container')
    }

    //resize-container
    init = () => {
        this.orig_src.src = this.image_target.src;

        this.$container = $(this.image_target).parent('.resize-container');

        this.$container.on('mousedown touchstart', '.resize-handle', this.startResize);

        this.$container.on('mousedown touchstart', 'img', this.startMoving);
    }

    startResize = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.saveEventState(e);
        $(document).on('mousemove touchmove', this.resizing);
        $(document).on('mouseup touchend', this.endResize);
    };

    startMoving = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.saveEventState(e);
        $(document).on('mousemove touchmove', this.moving);
        $(document).on('mouseup touchend', this.endMoving);
    };

    resizing = (e) => {
        var mouse: any = {}, width, height, left, top, offset = this.$container.offset();
        mouse.x = (e.clientX || e.pageX || e.originalEvent.touches[0].clientX) + $(window).scrollLeft();
        mouse.y = (e.clientY || e.pageY || e.originalEvent.touches[0].clientY) + $(window).scrollTop();

        // Position image differently depending on the corner dragged and constraints
        if ($(this.event_state.evnt.target).hasClass('resize-handle-se')) {
            width = mouse.x - this.event_state.container_left;
            height = mouse.y - this.event_state.container_top;
            left = this.event_state.container_left;
            top = this.event_state.container_top;
        } else if ($(this.event_state.evnt.target).hasClass('resize-handle-sw')) {
            width = this.event_state.container_width - (mouse.x - this.event_state.container_left);
            height = mouse.y - this.event_state.container_top;
            left = mouse.x;
            top = this.event_state.container_top;
        } else if ($(this.event_state.evnt.target).hasClass('resize-handle-nw')) {
            width = this.event_state.container_width - (mouse.x - this.event_state.container_left);
            height = this.event_state.container_height - (mouse.y - this.event_state.container_top);
            left = mouse.x;
            top = mouse.y;
            if (this.constrain || e.shiftKey) {
                top = mouse.y - ((width / this.orig_src.width * this.orig_src.height) - height);
            }
        } else if ($(this.event_state.evnt.target).hasClass('resize-handle-ne')) {
            width = mouse.x - this.event_state.container_left;
            height = this.event_state.container_height - (mouse.y - this.event_state.container_top);
            left = this.event_state.container_left;
            top = mouse.y;
            if (this.constrain || e.shiftKey) {
                top = mouse.y - ((width / this.orig_src.width * this.orig_src.height) - height);
            }
        }

        // Optionally maintain aspect ratio
        if (this.constrain || e.shiftKey) {
            height = width / this.orig_src.width * this.orig_src.height;
        }

        if (width > this.min_width && height > this.min_height && width < this.max_width && height < this.max_height) {
            // To improve performance you might limit how often resizeImage() is called
            this.resizeImage(width, height);
            // Without this Firefox will not re-calculate the the image dimensions until drag end
            this.$container.offset({ 'left': left, 'top': top });
        }
    }

    resizeImage = (width, height) => {
        this.resize_canvas.width = width;
        this.resize_canvas.height = height;
        this.resize_canvas.getContext('2d').drawImage(this.orig_src, 0, 0, width, height);
        $(this.image_target).attr('src', this.resize_canvas.toDataURL("image/png"));
    };

    endResize = (e) => {
        e.preventDefault();
        $(document).off('mouseup touchend', this.endResize);
        $(document).off('mousemove touchmove', this.resizing);
        tb.endResize(e);
    };

    moving = (e) => {
        var mouse: any = {}, touches;
        e.preventDefault();
        e.stopPropagation();

        touches = e.originalEvent.touches;

        mouse.x = (e.clientX || e.pageX || touches[0].clientX) + $(window).scrollLeft();
        mouse.y = (e.clientY || e.pageY || touches[0].clientY) + $(window).scrollTop();
        this.$container.offset({
            'left': mouse.x - (this.event_state.mouse_x - this.event_state.container_left),
            'top': mouse.y - (this.event_state.mouse_y - this.event_state.container_top)
        });
        // Watch for pinch zoom gesture while moving
        if (this.event_state.touches && this.event_state.touches.length > 1 && touches.length > 1) {
            var width = this.event_state.container_width, height = this.event_state.container_height;
            var a = this.event_state.touches[0].clientX - this.event_state.touches[1].clientX;
            a = a * a;
            var b = this.event_state.touches[0].clientY - this.event_state.touches[1].clientY;
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
            this.resizeImage(width, height);
        }
    };

    endMoving = (e) => {
        e.preventDefault();
        $(document).off('mouseup touchend', this.endMoving);
        $(document).off('mousemove touchmove', this.moving);
        tb.endMove(e);
    };

    saveEventState = (e) => {
        // Save the initial event details and container state
        this.event_state.container_width = this.$container.width();
        this.event_state.container_height = this.$container.height();
        this.event_state.container_left = this.$container.offset().left;
        this.event_state.container_top = this.$container.offset().top;
        this.event_state.mouse_x = (e.clientX || e.pageX || e.originalEvent.touches[0].clientX) + $(window).scrollLeft();
        this.event_state.mouse_y = (e.clientY || e.pageY || e.originalEvent.touches[0].clientY) + $(window).scrollTop();

        // This is a fix for mobile safari
        // For some reason it does not allow a direct copy of the touches property
        if (typeof e.originalEvent.touches !== 'undefined') {
            this.event_state.touches = [];
            $.each(e.originalEvent.touches, function (i, ob) {
                this.event_state.touches[i] = {};
                this.event_state.touches[i].clientX = 0 + ob.clientX;
                this.event_state.touches[i].clientY = 0 + ob.clientY;
            });
        }
        this.event_state.evnt = e;
    };
}

var tb = new TogetherBoard();

var dEditor = new DocEditor();

$(document).ready(() => {

    $('.mainWhiteBoard').on('click', (e) => {
        tb.AddNewBlock(e);
    });

    $('.mainWhiteBoard').on('input', '.editBlockInput', (e) => {
        if ($(e.target).find('img').length) {
            return;
        }
        tb.OnUpdateBoard(actionsLocal.update, <IUpdateInfoLocal>{
            action: actionsLocal.update,
            elementId: $(e.target).parent().attr('id')
        });
    });

    if (document.addEventListener) {
        document.addEventListener('paste', tb.onPasteTriggered, false);
    }

    $('.mainWhiteBoard')
        .on('click', '.imgBlock', (e) => {
            let tinfo = tb.GetPositionInfo(e.target);
            tb.ShowTools(tinfo, true);
            tb.setActive(null, e.target);
            tb.SetToolsTarget(e.target);
            e.stopPropagation();
        }).on('click', '.resize-container', (e) => {
            let tinfo = tb.GetPositionInfo(e.target);
            tb.ShowTools(tinfo, true);
            tb.setActive(null, e.target);
            $('.editBlockInput').blur()
            tb.SetToolsTarget(e.target);
            $('#tb-tools').show();
            e.stopPropagation();
        }).on('keyup', '.editBlockInput', (e) => {
            if (e.keyCode === 13 || e.keyCode === 8) {
                let tinfo = tb.GetPositionInfo(e.target);
                tb.ShowTools(tinfo);
                tb.SetToolsTarget(e.target);
            }
        }).on('click', '.editBlock', (e) => {
            e.stopPropagation();
        }).on('mousedown', '.editBlock', (e) => {
            tb.beginMove(e, e.currentTarget)
        }).on('blur', '.editBlockInput', (e) => {
            if (!toolflag) {
                tb.cleanIfEmpty(e, e.currentTarget);
            }
            toolflag = false;
            $('#tb-tools').hide();
            console.info('==>blur')
        }).on('focus', '.editBlockInput', (e) => {
            let tinfo = tb.GetPositionInfo(e.target);
            tb.ShowTools(tinfo);
            tb.SetToolsTarget(e.target);
            tb.setActive(e, e.currentTarget);
        }).on('mousedown', '.editBlockInput', (e) => {
            e.stopPropagation();
        });

    $('#tb-tools').find('a').mousedown((e) => {
        console.info('tool');
        let action = $(e.currentTarget).attr('data-action');
        let elementId = $('#tb-tools').attr('data-target-id');
        let tagName;
        if (!elementId) {
            return
        }
        switch (action) {
            case 'trash':
                if (elementId === 'mainWhiteBoard') {
                    break;
                }
                toolflag = true;
                $('#' + elementId).remove();
                tb.OnUpdateBoard(actionsLocal.del, <IUpdateInfoLocal>{
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
                let size = tagName == 'a' ? $(e.target).find('font').attr('size') : $(e.target).attr('size');
                dEditor.OnFontSize(size);
                break;
            case 'color-1':
            case 'color-2':
            case 'color-3':
            case 'color-4':
                tagName = e.target.tagName.toLowerCase();
                let color = tagName == 'a' ? $(e.target).find('span').css('color') : $(e.target).css('color');
                dEditor.OnForeColor(color);
                break;
            default:
                break;
        }
        //dEditor.OnUnSelect();
        e.preventDefault();
        return false;
    })
});