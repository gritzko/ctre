/** CTRE-backed deep hypertext implementation.
    to be used as the Controller part of a MVC
    construct (ctre is Model, browser is View) */

function DHYT (body_weave,headers_weave,authors,default_author) {
    this.body = new CT(body_weave,authors);
    this.head = new CT(headers_weave,authors);
    this.author = default_author;
}

DHYT.re_prev3 = "$3*?.($2).$P";
DHYT.prototype.getPrev = function (pos) {
    var re_seek = CT.re(DHYT.re_prev3,{'P':pos},'m');
    var m = this.ct.getText3.match(re_seek);
    return m && m[1];
}

DHYT.prototype.addHeader = function (name, value, range) {
    var header = name;
    if (value)
        header+='='+value;
    if (range)
        header+=':'+range;
    header+='\n';
    this.head.insertText("00",header,this.author);
}

DHYT.prototype.getSelection = function () {
    return this.selection || "0000";
}

DHYT.prototype.selend = function () {
    return this.getSelection().substr(2,2);
}

DHYT.prototype.insertText = function (text) {
    if (!text) return;
    var feedlen = this.body.insertText(this.selend(),text,this.author);
    this.selection = feedlen+feedlen;
}

DHYT.prototype.removeText = function (back) {
    if (this.selection.empty()) {
        if (back)
            this.ct.remove(this.ct.getText1Prev(this.sel.end()));
        else
            this.ct.remove(this.sel.end());
    } else {
        this.ct.remove(this.sel);
    }
}

DHYT.re_3hili_span = CT.re("$1(..)(?:$1\\1)*");
DHYT.prototype.markHili = function () {
    var hili = this.body.getHili3();
    var text3 = this.body.getText3();
    var m = [];
    var re = DHYT.re_3hili_span;
    while (m=re.match(hili)) {
        var paint = m[1];
        var beg_id = text3.substr(m.index*3+1,2);
        var end_id = re.lastIndex==hili.length ?
            "01" : text3.substr(re.lastIndex*3+1,2);
        this.addMark("in",paint[0],beg_id+end_id);
        this.addMark("rm",paint[1],beg_id+end_id);
    }
}

DHYT.re_line = /^([#\*\"]*).*?$/mg;
DHYT.prototype.markStructurals = function () {
    var text1 = this.body.getText1();
    var text3 = this.body.getText3();
    var m;
    while (m=DHYT.re_line.match(text1)) {
        var beg_id = text3.substr(m.index*3+1,2);
        var li = DHYT.re_line.lastIndex;
        var end_id = li==text1.length ? "01" : text3.substr(li*3+1,2);
        var ti = m.index+(m[1]?m[1].length:0);
        var txt_id = ti==text1.length ? "01" : text3.substr(ti*3+1,2);
        this.addMark("struct",m[1]?m[1]:'',beg_id+end_id);
        this.addMark("hide",undefined,beg_id+txt_id);
    }
}

DHYT.re_header = CT.re("^(\\w+)(?:=(\\w*))?:\\s*($2$2)$");
DHYT.prototype.markHeaders = function () {
    var h1 = this.head.getText1();
    var m;
    while (m=DHYT.re_header.exec(h1))
        this.addMark(m[1],m[2],m[3]);
}

DHYT.prototype.addMark = function (name, value, range) {
    // todo check range
    var id = String.fromCharCode(0xffff,this.marks.length);
    this.marks.push({"name":name,"value":value,"range":range});
    var marker_str = range.replace(CT.re_2,"\0$&"+id);
    this.marks5c.push(marker_str);
}

DHYT.prototype.markSelection = function () {
    this.addMark("selection",undefined,this.getSelection());
}

DHYT.prototype.markAwareness = function () {
    var weft = this.body.getWeft2();
    var aware = weft.replace(CT.re_2,"\u0006$1\uffff0");
    this.marks5c.push(aware);
}

DHYT.re_marks = CT.re("(\0$2)((?:[^\0]$2)*)");
DHYT.prototype.toHTML = function (range) {
    this.marks5c = [];
    this.marks = [];
    range = range || "0001";
    this.markAwareness();
    // 1. compile the marks
    // 1.a. header marks
    this.markByHeaders();
    // 1.b. selection marks
    this.markSelection();
    // 1.c. change hili marks
    this.markHili();
    // 1.d. syntax hili marks (future work)
    // this.markSyntax();
    // 1.e. visible range marks
    this.markVisibleRange (range);
    // 1.f. wikitext stucturals
    this.markStructurals();
    // 2. add annotations to the weave
    var ct_marked = this.ct.clone();
    // todo save mark-feed - awareness
    ct_marked.addPatch5c(this.marks.join(''));
    //var text3_marked = ct_marked.getText3();
    //var stop_ids_str = text3_marked.replace(/(...)*?[\0\n](..)/g,"$2");
    //var stop_ids = stop_ids_str.match(/../g).reverse();
    var text3_marked = ct_marked.getText3();
    var stack = '';
    var classes = '';
    // 3. intersperse text and markup
    function addMarkup(chunk,mark,span,offset,text) {
        var id = text3_marked.substr(offset*3+1,2);
        var name = this.marks[id].name;
        var value = this.marks[id].value;
        if (name==="struct") { // change the *#" struct stack
            var old=stack;
            var neu=value;
            while (old[0]==neu[0]) {
                old=old.substr(1);
                neu=neu.substr(1);
            }
            for(var i=old.length-1; i>=0; i--)
                html.push(DHYT.html_close_tags[old[i]]);
            for(var i=0; i<neu.length; i++)
                html.push(DHYT.html_open_tags[neu[i]]);
            stack = value;
            if (stack)
                html.push(DHYT.html_add_tags[stack[stack.length-1]]);
        } else {
            var class_str = name+' ';
            if (value)
                class_str += name+id2hex(id)+' ';
            if (open[id]) {
                delete open[id];
                classes.replace(class_str,'');
            } else {
                open[id] = true;
                classes = class_str + classes;
            }
        }
        return "<s class=\""+classes+"\">"+span+"</s>";
    }
    var html = ct_marked.getText1().replace(DHYT.re_marks,addMarkup);
    return html;
}


DHYT.selfCheck = function () {
    var testeq = CT.testeq;
    var log = CT.log;
    // gradually build a big text, verify key ranges
    var authors = new CTRoster({'A':"Alice",'B':"Bob"});
    var dh = new DHYT('','',authors,"Alice");
    dh.insertText("Test");
    dh.addHeader("Bold",'',"A0A1");
    var text = dh.body.getText1();
    testeq("Test",text);
    testeq("Bold:A0A1\n",dh.head.getText1());
    var html = dh.toHTML();
    testeq("<div><p><span class='bold'>T</span><span class=''>est</span></p></div>",html);
    testeq("T",dh.ct.getText1Range("A0A1"));
}
