/** Turns on paranoid correctness checks. */
CT.prototype.leery = true;

CT.prototype.re_wv5csyn = 
    /^\x010000(.[0A-\uffff][^\0-\x2f][0A-\uffff][^\0-\x2f])*\x040001$/;
/** Causal Trees (CT) version control implementation. For the theory see
 *  Victor Grishchenko "Deep hypertext with embedded revision control
 *  implemented in regular expressions"
 *  http://portal.acm.org/citation.cfm?id=1832772.1832777 */
function CT (weave5c,sources) {
    if (leery && !weave5c.match(this.re_wv5csyn)) throw "invalid weave5c";
    // these two are the only "primary" members; the rest is derived
    this.weave5c = weave5c || "\u00010000\u00040001";
    this.sources = sources || {"default":'0'};
}

CT.prototype.re_weave2weft = /...(..)/g;
/** Returns the current revision's vector timestamp (i.e. a weft) in the
    canonic form (no redundancy, sorted by yarn id). */
CT.prototype.getWeft2 = function () {
    if (this.weft2) return this.weft2; 
    var raw = this.weave5c.replace(this.re_weave2weft,"$1");
    this.weft2 = this.dryWeft2(raw);
    return this.weft2;
}

CT.prototype.getWeave5c = function () {
    return this.weave5c;
}

CT.prototype.allocateYarnCode = function () {
    var ids = this.getSortedYarnIds();
    if (ids==="0") return "A";
    return String.fromCharCode(ids.charCodeAt(ids.length-1)+1);
}

CT.prototype.re_3to1 = /(.)../g;
/** Returns the current version in almost-plain text (still has markers, e.g.
 *  \1 in the beginning and \4 in the end.  */
CT.prototype.getText1 = function () {
    return this.text1 || (this.text1=this.getText3().replace(this.re_3to1,"$1"));
}

CT.prototype.re_5cto3 = /(.)..(..)/g;
/** Returns the 3-form of the text, i.e. symbol-author-offset tuples. */
CT.prototype.getText3 = function () {
    return this.text3 || (this.text3=this.getText5c().replace(this.re_5cto3,"$1$2"));
}

CT.prototype.re_scouring = 
 /.{5}(?:(?:\x7F....)+\b....)*\b....(?:[\x7F\b]....)*|(.{5})(?:[\x7F\b]....)*/g;
// any deleted and undeleted but finally deleted    OR    whatever
/** Text5c is derived from weave5c by scouring. */
CT.prototype.getText5c = function () {
    if (this.text5c) return this.text5c;
    this.text5c = this.weave5c.replace(this.re_scouring,"$1");
    return this.text5c;
}

CT.prototype.re_deps = /.(.).\1.|.(....)/g;
/** Deps4 contains inter-feed causal dependencies. */
CT.prototype.getDeps4c = function () {
    return this.deps4c || (this.deps4c=this.weave5c.replace(this.re_deps,"$2"));
}

CT.re_meta = /([\\\.\^\$\*\+\?\(\)\[\]\{\}\:\=\!\|\,])/g;
CT.escapeMeta = function (re_str) {
    return re_str.replace(CT.re_meta,"\\\\$1");
}

CT.re_filt = /(\\.|.)(\\.|.)/g;
CT.re_weft2syn = /^([0A-\uffff][^\0-\x2f])+$/;
/** Filtre is a regex matching atom ids under the weft. Filtres are mostly
    useful for filtering weaves/whatever according to wefts,
    i.e. for restoring/checking against historical state. */
CT.getFiltre = function (weft2) {
    if (this.leery && !weft2.match(CT.re_weft2syn)) throw "not a weft2";
    var escaped = CT.escapeMeta(weft2);
    var filtre = escaped.replace(CT.re_filt,"|$1[0-$2]");
    return filtre.substr(1);
}

/** Exclusive filtre, i.e. [0-x) instead of [0-x]. */
CT.prototype.getExFiltre = function (weft2) {
    var escaped = weft2.replace(CT.re_meta,"\\\\$1");
    var exfiltre = escaped.replace(CT.re_filt,"|$1[^$2-\uFFFF]");
    return exfiltre.substr(1);
}

CT.re_nordn = /(.).(\1.)+|(..)/g;
/** Returns canonic weft2 form: sorted by yarn id, no redundancy. */
CT.dryWeft2 = function (weft2) {
    var ids = weft2.match(/../g); // PERF massive String creation
    var sorted = ids.sort().join('');
    var dered = sorted.replace(this.re_nordn,"$2$3");
    return dered;
}

/** Make a transitive closure of causal dependencies; return a closed weft. */
CT.prototype.closeWeft2 = function (weft2) {
    var w2 = null;
    while (false && weft2!=w2) {
        w2 = weft2;
        var filtre = new RegExp("(..)(?:"+this.getFiltre(weft2)+")");
        var covers = this.getDeps4().replace(filtre,"$1");
        weft2 = CT.dryWeft2(weft2+covers);
    }
    return weft2;
}

CT.prototype.re_yarnidclean = /[^\0]+\0(.)\0/g;
CT.prototype.getSortedYarnIds = function () {
    if (this.yarn_ids)
        return this.yarn_ids;
    var srt = [], ids = [];
    for(var source in this.sources)
        srt.push(source);
    srt.sort();
    for(var i=0; i<srt.length; i++)
        ids.push(this.sources[ids[i]]);
    return this.yarn_ids = ids.join('');
}

/** Returns the last known offset in the yarn, an empty string otherwise. */
CT.getYarnLength = function (weft2,yarnid) {
    if (!yarnid) throw "no yarn id provided";
    var m = weft2.match("^(?:..)*?"+yarnid+"(.)");
    return m ? m[1] : '';
}

CT.prototype.re_form2 = /../g;
CT.prototype.re_greater = /(..)\1|(.).(\1.)|(..)/g;
/** Compare two weft2s according to the weftI-ordering (see the paper). */
CT.prototype.compareWeft1 = function (weft2a,weft2b) {
    var split = (weft2a+weft2b).match(re_form2);
    var sorted = split.sort().join('');
    var diff = sorted.replace(this.re_greater,"$3$4");
    if (!diff)
        return 0;
    var re_diff = new RegExp("(["+CT.escapeMeta(diff)+"])|.","g");
    var srt_diff = this.getSortedYarnIds().replace(re_diff,"$1");
    var win = srt_diff.charAt(srt_diff.length-1);
    return CT.getYarnLength(weft2a,win) > CT.getYarnLength(weft2a,win) ? 1 : -1;
}

CT.prototype.getYarnLength = function (yarnid) {
    return CT.getYarnLength(this.getWeft2(),yarnid);
}

CT.prototype.getYarnAwareness = function (yarnid) {
    if (!this.awareness) this.awareness={};
    if (this.awareness[yarnid]) return this.awareness[yarnid];
    var len = this.getYarnLength(yarnid);
    if (!len) return "01";
    return this.awareness[yarnid]=this.closeWeft2(yarnid+len);
}

CT.prototype.re_causal_block =
    /^((?:.{5})*)(...$R)((?:.$R..(?:.{5})*?)*)(.$W.*)$/;
CT.prototype.re_siblings = /.$R..(?:.{5})*?(?=.$R..|$)/g;
CT.prototype.addChunk5cHardcore = function (chunk5c) {
    var root = chunk5c.substr(1,2);
    var head = chunk5c.substr(3,2);
    var root_aw_weft = this.closeWeft2(root);
    var re_split = this.re_causal_block.fill({'R':root,'W':root_aw_weft});
    var split = this.weave5c.match(re_split);
    if (!split) throw "cannot find the attachment point";
    var beginning = split[1];
    var attach = split[2];
    var caused = split[3];
    var end = split[4];
    var head_aw_weft = this.closeWeft2(head);
    var siblings = caused.match(this.re_siblings.fill({'R':root}));
    var i=0;
    for(; i<siblings.length; i++) {
        var sib_aw_weft = this.getAwareness(siblings[i].substr(3,2));
        if (this.compareWeft1(head_aw_weft,sib_aw_weft)==1)
            break;
    }
    siblings.splice(i,0,chunk5c);
    this.weave5c = beginning + attach + siblings.join('') + end;
} /// <<< 2 pass till here

CT.prototype.addChunk5c = function (chunk5c) {
    var attach = chunk5c.substr(1,2);
    if (this.getYarnLength(attach[0])<attach[1])
        throw "deferred chunks: not implemented yet";
    var head = chunk5c.substr(3,2);
    if (this.getYarnLength(head[0])>=head[1]) // FIXME: not just head && leery
        throw "repeated chunk: not implemented yet";
    var aware = this.getYarnAwareness(head[0]);
    var awrflt = this.getFiltre(aware);
    var re_pre = "^((?:.{5})*?)";
    var re_attach = "(..."+attach+"(?:[\u007F\u0008]....)*)";
    var re_ahead = "(...(?:"+awrflt+"))";
    var re_patch = new RegExp(re_pre + re_attach + re_ahead);
    var new_weave5c = this.weave5c.replace(re_patch,"$1$2"+chunk5c+"$3");
    if (new_weave5c.length!=this.weave5c.length+chunk5c.length)
        this.addChunk5cHardcore(chunk5c);
    else
        this.weave5c = new_weave5c;
    //this.awareness[yarn]=null; // TODO
}

CT.prototype.re_chunk = /...(?:(..).\1)*../g;  // the Spui regex
/** The only method that mutates weave5c. */
CT.prototype.addPatch5c = function (patch5c) {
    this.text5c = this.text3 = this.text1 = this.deps4c = undefined;
    var chunks = patch5c.match(this.re_chunk);
    for(var i=0; i<chunks.length; i++)
        this.addChunk5c(chunks[i]);
}

CT.prototype.getVersion = function (weft2) {
    var re_fre = new RegExp("(..."+this.getFiltre(weft2)+")|.....","g");
    var weave5cver = this.weave5c.replace(re_fre,"$1");
    return new CT(weave5cver,sources);
}

CT.prototype.re_form3 = /.../g;
CT.prototype.addPatch3c = function (patch3c, source) {
    var yarn = this.sources[source];
    if (!yarn) yarn = this.allocateYarnCode();
    var len = this.getYarnLength(yarn);
    len = len ? len.charCodeAt(0) : 0x2f;
    var atoms = patch3c.match(this.re_form3);
    var form5c = [];
    for(var i=0; i<atoms.length; i++) {
        form5c.push(atoms[i].charAt(0));
        if (atoms[i].substr(1,2)==="01") { // spec val for "caused by prev"
            form5c.push(yarn);
            form5c.push(String.fromCharCode(len));
        } else 
            form5c.push(atoms[i].substr(1,2));
        form5c.push(yarn);
        form5c.push(String.fromCharCode(++len));
    }
    this.addPatch5c(form5c.join(''));
}

CT.prototype.re_ctremeta = /[\u0000-\u0019]/g;
CT.prototype.getPlainText = function () {
    return this.getText1().replace(re_ctremeta,'');
}

CT.prototype.re_del3to5 = /.(..)/g;
CT.prototype.addVersion = function (text1,source,weft2) {
    var base = weft2 ? this.getVersion(weft2) : this;
    var base3 = base.getText3();
    var base1 = base.getText1();
    if (text1===base1)
        return this.getWeft2();
    var pref = Math.min(text1.length,base1.length);
    var pre = 0;
    while (pref>0) {
        if (base1.substr(0,pref)===text1.substr(0,pref)) {
            base1 = base1.substr(pref);
            text1 = text1.substr(pref);
            pre += pref;
        }
        pref = (pref>>1) + (pref>1?pref&1:0);
    }
    var postf = Math.min(text1.length,base1.length);
    while (postf>0) {
        if (base1.substr(base1.length-postf)===text1.substr(text1.length-postf)) {
            base1 = base1.substr(0,base1.length-postf);
            text1 = text1.substr(0,text1.length-postf);
        }
        postf = (postf>>1) + (postf>1?postf&1:0);
    }
    var changes3c = [];
    function append_insertion (offset, text) {
        //sibling check goes here
        var head = base3.substr(offset*3+1-3,2);
        changes3c.push(text.charAt(0)+head);
        changes3c.push(text.substr(1).replace(/(.)/g,"$101"));
    }
    function append_removal (offset, length) {
        var chunk = base3.substr(offset*3,length*3);
        changes3c.push(chunk.replace(/.(..)/g,"\8$1"));
    }
    var p;
    if (text1.length==0) { //removal
        append_removal(pre,base1.length);
    } else if (base1.length==0) {
        append_insertion(pre,text1);
    } else if (base1.length>text1.length && -1!=(p=base1.indexOf(text1))) {
        append_removal(pre,p);
        append_removal(pre+p+text1.length,base1.length-text1.length-p);
    } else if (base1.length<text1.length && -1!=(p=text1.indexOf(base1))) {
        append_insertion(pre,text1.substr(0,p));
        append_insertion(pre+base1.length,text1.substr(p+base1.length));
    } else {
        append_removal(pre,base1.length);
        append_insertion(pre,text1);
    }
    var patch3c = changes3c.join('');
    this.addPatch3c(patch3c,source);
    return patch3c;
}


CT.selfCheck = function () {
    alert("be ready");
    function testeq (must, is) {
        if (must!==is)
            throw "equality test fail: "+must+"!="+is;
    }
    function log (rec) {
        if (window)
            document.body.appendText(rec);
    }
    
    // test statics
    testeq("1\\.2\\-3\\]",CT.escapeMeta("1.2-3]"));
    testeq("0[0-1]|A[0-\\?]|\\[[0-8]",CT.getFiltre("01A?[8"));
    testeq("0[^1-\uffff]|A[^\\?-\uffff]|\\[[^8-\uffff]",CT.getFiltre("01A?[8"));
    testeq("01A2B3C4",CT.dryWeft2("B301B2A0C400C1A2"));
    testeq("4",CT.getYarnLength("01A2B3C4"));
    
    // test the object
    var test = new CT();
    testeq("01",test.getWeft2());
    testeq(test.allocateYarnCode(),"A");
    testeq("0A",test.getSortedYarnIds());
    testeq("\1\4",test.getText1());    
    testeq(0,test.compareWeft1("01","01"));
    testeq(-1,test.compareWeft1("01","01A2"));
    testeq("01A2",test.getYarnAwareness("A"));
    
    var v_te = test.addVersion("\1Te\4","Alice");
    testeq(test.allocateYarnCode(),"B");
    testeq("\1Te\4",test.getText1());
    testeq("\x010000T00A0eA0A1\x040001",test.getWeave5c());
    testeq("00A0",test.getDeps4());
    testeq("0A",test.getSortedYarnIds());
    
    var v_test = test.addVersion("\1Test\4","Alice");
    testeq("01A4",v_test);
    testeq("\1Test\4",test.getText1());
    
    var v_text = test.addVersion("\1Tekst\4","Bob");
    wefteq("01A4B1",test.getWeft2());
    testeq("00A0A4B0A1B1",test.getDeps4());
    testeq("0AB",test.getSortedYarnIds());
    testeq(1,test.compareWeft1("01A4B1","01A4"));
    testeq("01A4B1",test.getYarnAwareness("B")); // awareness decl
    testeq("01A4B1",test.closeWeft2("B1"));

    var v_tekxt = test.addVersion("\1Text\4","Carol",v_test);
    testeq("0ABC",test.getSortedYarnIds());
    wefteq("01A4B1C2",test.getWeft2());
    testeq("\1Tekxt\4",test.getText1());
    testeq("\x010000T00A0eA0A1kA1B0xA1C1sA1A2\bA2C0tA2A3\x040001",test.getWeave5c()); // add awareness
    testeq(1,test.compareWeft1("01A4B1","01A4C2"));
    testeq("01A4B1",test.getYarnAwareness("B")); // awareness decl
    
    log("basic functionality test OK");
    
    // concurrency test
    // performance test
    // incorrect input tests

}
