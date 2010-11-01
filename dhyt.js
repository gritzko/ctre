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
DHYT.prototype.selbeg = function () {
    return this.getSelection().substr(0,2);
}

DHYT.prototype.indexOf = function (id) {
    var t3 = this.body.getText3();
    var pos = -1;
    while ( -1!=(pos=t3.indexOf(id,pos+1)) && (pos%3!=1) );
    return pos==-1 ? -1 : (pos-1)/3;
}

DHYT.prototype.rightFrom = function (id) {
    var t3 = this.body.getText3();
    var pos = this.indexOf(id);
    if (pos==-1 || pos==t3.length/3-1)
        return "01";
    else
        return t3.substr(pos*3+4,2);
}

DHYT.prototype.leftFrom = function (id) {
    var t3 = this.body.getText3();
    var pos = this.indexOf(id);
    if (pos<1)
        return "00";
    else
        return t3.substr(pos*3-2,2);
}

DHYT.prototype.insertText = function (text) {
    if (!text) return;
    var posid = this.leftFrom(this.selend());
    var yt = this.body.insertText(posid,text,this.author);
    if (posid!="00")
        this.selection = this.selend()+this.selend();
    else
        this.selection = this.rightFrom(yt)+this.rightFrom(yt);
}

DHYT.prototype.removeText = function (back) { // fixme dead selection
    var range3 = this.body.getText3Range(this.getSelection());
    var ids = range3.replace(CT.re_3,"$2");
    this.body.removeText(ids,this.author);
}

DHYT.re_3hili_span = CT.re("$1($2)(?:$1\\1)*");
DHYT.prototype.markHili = function () {
    var hili = this.body.getHili3("01");
    var text3 = this.body.getText3();
    var m = [];
    var re = DHYT.re_3hili_span;
    while (m=re.exec(hili)) {
        var paint = m[1];
        var beg_id = text3.substr(m.index+1,2);
        var end_id = re.lastIndex==hili.length ?
            "01" : text3.substr(re.lastIndex+1,2);
        this.addMark("in",paint[0],beg_id+end_id);
        this.addMark("rm",paint[1],beg_id+end_id);
    }
}

DHYT.re_line = new RegExp("^([#\\*\\\"]*).*?$","gm");
DHYT.prototype.markStructurals = function () {
    var text1 = this.body.getText1();
    var text3 = this.body.getText3();
    var m;
    while (m=DHYT.re_line.exec(text1)) {
        var beg_id = text3.substr(m.index*3+1,2);
        var li = DHYT.re_line.lastIndex;
        var end_id = li==text1.length ? "01" : text3.substr(li*3+1,2);
        var ti = m.index+(m[1]?m[1].length:0);
        var txt_id = ti==text1.length ? "01" : text3.substr(ti*3+1,2);
        this.addMark("struct",m[1]?m[1]:'',beg_id+end_id);
        if (beg_id!=txt_id)
            this.addMark("hide",undefined,beg_id+txt_id);
    }
}

DHYT.re_header = CT.re("^(\\w+)(?:=(\\w*))?:\\s*($2$2)$");
DHYT.prototype.markByHeaders = function () {
    var h1 = this.head.getText1();
    var m;
    while (m=DHYT.re_header.exec(h1))
        this.addMark(m[1],m[2],m[3]);
}

DHYT.prototype.markSelection = function () {
    this.addMark("selection",undefined,this.getSelection());
}

DHYT.prototype.addMark = function (name, value, range) {
    //var offset = this.marks.length*2 + '0'.charCodeAt(0);
    var mark_obj = ({"name":name,"value":value,"range":range,"open":false});
    var a_id = String.fromCharCode(0xffff,this.mark_cnt++);
    var b_id = String.fromCharCode(0xffff,this.mark_cnt++);
    var a_mark5c = '\u0005'+range.substr(0,2) + a_id;
    var b_mark5c = '\u0005'+range.substr(2,2) + b_id;
    this.marks[a_id] = this.marks[b_id] = mark_obj;
    this.marks5c.push(a_mark5c,b_mark5c);
}

/*DHYT.prototype.markAwareness = function () {
    var weft = this.body.getWeft2();
    var aware = weft.replace(CT.re_2,"\u0006$1\uffff0");
    this.marks5c.push(aware);
}*/

DHYT.re_marks = CT.re("\5([^\5]*)");
DHYT.prototype.toHTML = function (range) {
    this.marks5c = [];
    var marx = this.marks = [];
    this.mark_cnt = '0'.charCodeAt(0);
    range = range || "0001";
    //this.markAwareness();
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
    //this.markVisibleRange (range);
    // 1.f. wikitext stucturals
    this.markStructurals();
    // 2. add annotations to the weave
    var ct_marked = this.body.clone();
    // todo save mark-feed - awareness
    ct_marked.addPatch5c(this.marks5c.join(''));
    //var text3_marked = ct_marked.getText3();
    //var stop_ids_str = text3_marked.replace(/(...)*?[\0\n](..)/g,"$2");
    //var stop_ids = stop_ids_str.match(/../g).reverse();
    var text3_marked = ct_marked.getText3();
    var text1_marked = ct_marked.getText1();
    var stack = '';
    var classes = '';
    var attributes = '';
    // 3. intersperse text and markup
    function addMarkup(chunk,span,offset,text) {
        var id = text3_marked.substr(offset*3+1,2);
        var mark = marx[id];
        if (name==="struct") { // change the *#" struct stack
            var old=stack;
            var neu=mark.value;
            while (old[0]==neu[0]) {
                old=old.substr(1);
                neu=neu.substr(1);
            }
            for(var i=old.length-1; i>=0; i--)
                html.push(DHYT.html_close_tags[old[i]]);
            for(var i=0; i<neu.length; i++)
                html.push(DHYT.html_open_tags[neu[i]]);
            stack = mark.value;
            if (stack)
                html.push(DHYT.html_add_tags[stack[stack.length-1]]);
        } else {
            var class_str = undefined;
            var att_str = undefined;
            if (mark.value)
                att_str = mark.name+"='"+mark.value+"' ";
            else
                class_str = mark.name+' ';
            if (mark.open) {
                mark.open=false;
                if (class_str)
                    classes = classes.replace(class_str,'');
                if (att_str)
                    attributes = attributes.replace(att_str,'');
            } else {
                mark.open=true;
                if (class_str)
                	classes = class_str + classes;
                if (att_str)
                    attributes = att_str + attributes;
            }
        } // todo: unnecessary empty spans do: mark.open=span_num
        return "<s class=\""+classes+"\" "+attributes+">"+span+"</s>";
    }
    var html = text1_marked.replace(DHYT.re_marks,addMarkup);
    return html;
}


DHYT.selfCheck = function () {
    var testeq = CT.testeq;
    var log = CT.log;
    function loghtml (html) {
        if (window) {
            var div = document.createElement("div");
            document.body.appendChild(div);
            div.innerHTML = html;
        } else
            console.log(rec+"\n");
    }
    // gradually build a big text, verify key ranges
    var authors = {'A':"Alice",'B':"Bob",'\uffff':"Markup"};
    var dh = new DHYT('','',authors,"Alice");
    dh.insertText("Test");
    dh.addHeader("Bold",'',"A0A1");
    var text = dh.body.getText1();
    testeq("Test",text);
    testeq("Bold:A0A1\n",dh.head.getText1());
    var html = dh.toHTML();
    //testeq("<div><p><span class='bold'>T</span><span class=''>est</span></p></div>",html);
    loghtml(html);
    //testeq("T",dh.ct.getText1Range("A0A1"));
    dh.selection = "A2A3";
    loghtml(dh.toHTML());
    dh.author = "Bob";
    dh.removeText();
    loghtml(dh.toHTML());
    dh.selection = "A3A3"; // fixme: dead range
    dh.insertText('x');
    loghtml(dh.toHTML());
}
