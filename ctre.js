
/** Causal Trees (CT) version control implementation. For the theory see
 *  Victor Grishchenko "Deep hypertext with embedded revision control
 *  implemented in regular expressions"
 *  http://portal.acm.org/citation.cfm?id=1832772.1832777 */
CT.default_yarn_url = "(default)";
function CT (weave5c,id2url) {
    if (this.leery && weave5c && !weave5c.match(this.re_wv5csyn))
        throw "invalid weave5c";
    // these two are the only "primary" members; the rest is derived
    this.weave5c = weave5c || "\u00010000\u00040001";
    this.id2url = id2url;
    this.url2id = {};
    this.url2id[CT.default_yarn_url] = '0';
    this.id2url['0'] = CT.default_yarn_url;
    this.weftsII = {};
    for(var id in this.id2url)
        this.url2id[this.id2url[id]] = id;
}

/** Turns on paranoid correctness checks. */
CT.prototype.leery = true;

CT.$chars = {
    '.' : '.',
    'b' : "\u0001",
    'e' : "\u0004",
    '<' : "\u0008", // del char
    '>' : "\u0015", // undel char  -- fixme undo 15 or 21 ???
    '@' : "\u0006", // awareness
    '!' : "\u0005", // interval marker
    'x' : "[\u0008\u0015]", // del/undel char
    'X' : "[^\u0008\u0015]", // not a del/undel char
    'm' : "[\u0008\u0015\u0006\u0005]", // meta char
    'M' : "[^\u0008\u0015\u0006\u0005]", // not a meta char
    'b' : "\u0001",  // start symbol
    'e' : "\u0004" // end symbol
};

CT.$ = {
    'f' : "[0-\uffff]", // feed id
    'o' : "[/-\uffff]", // offset
    '1' : "(?:.|\\s)",
    '2' : "(?:[0-\uffff][/-\uffff])", // feed+offset
    '3' : "(?:(?:.|\\s)[0-\uffff][/-\uffff])",
    '4' : "(?:(?:[0-\uffff][/-\uffff]){2})", // feed+offset twice
    '5' : "(?:(?:.|\\s)(?:[0-\uffff][/-\uffff]){2})", // form5
    'z' : "(?:\u0008\u0015+)"
};
CT.$.__proto__ = CT.$chars;

/** Dynamically composed regexes are even less readable using the standard
 notation RegExp("abc"+x+"."+y,"g") etc. Thus, I use template regexes
 defined as "abc$x.$y". */
CT.fill = function (template,values) {
    if (!template.replace)
        throw "supply a template string";
    function replacer(match,letter,twoletter) {
        var code = letter || twoletter;
        var ret = CT.$[code] || (values && values[code]);
        return ret || match;
    }
    var re_str = template.replace(/\$(.)|\%(..)/g,replacer);
    return re_str;
}

CT.re = function (template,values,flags) {
    var expr = CT.fill(template,values);
    return new RegExp(expr,flags==undefined?"gm":flags);
}

for(var i in CT.$chars) {
    CT.$[i+'3'] = CT.fill("(?:"+CT.$chars[i]+"$2)");
    CT.$[i+'5'] = CT.fill("(?:"+CT.$chars[i]+"$4)");
}
CT.$["z3"] = CT.fill("(?:$<$2(?:$>$2)+)");
CT.re_wv5csyn = CT.re("^$b0000(%X5((%>5)*%<5)*)*$e0001(%.5)*$");

CT.prototype.clone = function () {
    return new CT(this.weave5c,this.id2url);
}

CT.prototype.addAuthor = function (url,code) {
    if (!code) throw "no code";
    delete this.zeroWeftII;
    this.url2id[url] = code;
    this.id2url[code] = url;
}


CT.prototype.getZeroWeftII = function () {
    if (this.zeroWeftII) return this.zeroWeftII;
    var u = [];
    for(var url in this.url2id)
        u.push(url);
    u.sort();
    u.reverse();
    var w = [];
    this.weftIIpos = {};
    for (var url=u.pop(); url; url=u.pop()) {
        var yid = this.url2id[url];
        this.weftIIpos[yid] = w.length;
        w.push(yid+(yid=='0'?'1':'/'));
    }
    return ( this.zeroWeftII = w.join('') );
}


CT.prototype.convertWeft2toII = function (weft2) {
    var template = this.getZeroWeftII().match(CT.re_2);
    for(var i=0; i<weft2.length; i+=2) {
        var id = weft2.substr(i,2);
        var pos = this.weftIIpos[id[0]];
        if (id[1]>template[pos][1])
            template[pos] = id;
    }
    return template.join('');
}


CT.re_trans = "(?:$W)($2*?)(?=$W|$)";
CT.re_newdeps = CT.re("<<<<|($2)<<|$4");
/** Make a transitive closure of causal dependencies; return a closed weft. */
CT.prototype.closeWeft2 = function (weft2) {
    var w2 = null;
    while (weft2!=w2) {
        w2 = weft2;
        var re_covered = CT.re(CT.re_trans,{'W':CT.getFiltre(weft2)});
        var covers = this.getDeps4c().replace(re_covered,"<<$1");
        var extend = covers.replace(CT.re_newdeps,"$1");
        weft2 = CT.removeWeft2Redundancy(weft2+extend+"01");
    }
    return weft2;
}


CT.re_nordn = /(.).(\1.)+|(..)/g;
/** Returns canonic weft2 form: sorted by yarn id, no redundancy. */
CT.removeWeft2Redundancy = function (weft2) {
    var ids = weft2.match(CT.re_2); // PERF massive String creation
    var sorted = ids.sort().join('');
    var dered = sorted.replace(this.re_nordn,"$2$3");
    return dered;
}


/** Returns the current revision's vector timestamp (i.e. a weft) in the
    canonic form (no redundancy, sorted by yarn id). */
CT.prototype.getWeft2 = function () {
    if (this.weft2) return this.weft2; 
    var raw = this.weave5c.replace(CT.re_5,"$3");
    this.weft2 = CT.removeWeft2Redundancy(raw);
    return this.weft2;
}


CT.prototype.getWeave5c = function () {
    return this.weave5c;
}


CT.re_2 = CT.re("($2)");
CT.re_3 = CT.re("($1)($2)");;
CT.slim3to1 = function (form3) {
    return form3.replace(CT.re_3,"$1");
}


/** Returns the current version in plain text */ 
CT.prototype.getText1 = function () {
    return this.text1 || (this.text1=this.getText5c().replace(CT.re_5,"$1"));
}


CT.re_5 = CT.re("($1)($2)($2)");
/** Returns the 3-form of the text, i.e. symbol-author-offset tuples. */
CT.prototype.getText3 = function () {
    return this.text3 || (this.text3=this.getText5c().replace(CT.re_5,"$1$3"));
}


CT.prototype.getWeave3 = function () {
    return this.weave3 || (this.weave3=this.weave5c.replace(CT.re_5,"$1$3"));
}


//CT.prototype.re_scouring = 
//    CT.re("$5(?:(?:$>$4)+$<$4)*$<$4(?:$x$4)*|($5)(?:$x$4)*");
CT.re_scouring =
    CT.re("$5(%!5*)%@5*(?:%<5%>5+)*%<5%x5*|($5)(%!5*)%m5*",CT.$);
CT.re_weave5c = CT.re("^(%!5*)$b0000($5*?)$e0001($5*)$",CT.$,"m");
/** Text5c is derived from weave5c by scouring, i.e. removing deleted
    symbols and metasymbols (except for the markers). */
CT.prototype.getText5c = function () {
    if (this.text5c) return this.text5c;
    var txt5c = this.weave5c.replace(CT.re_scouring,"$1$3$2");
    var parsed = txt5c.match(CT.re_weave5c);
    if (parsed==null)
        alert('alarm!');
    this.text5c = parsed[1]+parsed[2];
    return this.text5c;
}


CT.prototype.re_deps = CT.re("$1(.).\\1.|$1($4)");
/** Deps4 contains inter-feed causal dependencies. */
CT.prototype.getDeps4c = function () {
    return this.deps4c || (this.deps4c=this.weave5c.replace(this.re_deps,"$2"));
}


CT.re_meta = /([\\\.\^\$\*\+\?\(\)\[\]\{\}\:\=\!\|\,\-])/g;
CT.escapeMeta = function (re_str) {
    return re_str.replace(CT.re_meta,"\\$1");
}

CT.test = function (str,re) {
    var re_re = CT.re(re);
    return re_re.test(str);
}

CT.re_filt = /(\\.|.)(\\.|.)/g;
CT.re_weft2syn = CT.re("^($2)+$");
CT.re_filtre = {
    "li":"|$1[0-$2]",
    "ri":"|$1[$2-\uffff]",
    "lx":"|$1[^0-$2]",
    "rx":"|$1[^$2-\uffff]"
};
CT.ids2re = function (ids) {
    var esc = CT.escapeMeta(ids);
    return esc.match(CT.re_filt).join('|');
}
/** Filtre is a regex matching atom ids under the weft. Filtres are mostly
    useful for filtering weaves/whatever according to wefts,
    i.e. for restoring/checking against historical state. */
CT.getFiltre = function (weft2,mode) {
    if (this.leery && !weft2.match(CT.re_weft2syn)) throw "not a weft2";
    var escaped = CT.escapeMeta(weft2);
    var expr = CT.re_filtre[mode||"li"];
    var filtre = escaped.replace(CT.re_filt,expr);
    return filtre.substr(1);
}

/** Exclusive filtre, i.e. [0-x) instead of [0-x]. */
CT.getExFiltre = function (weft2) {
    return CT.getFiltre(weft2,"rx");
}


CT.re_pair = /(.)(.)\1.|../g;
CT.getCommonWeft2 = function (wefta, weftb) {
    var arr = (wefta+weftb).match(CT.re_2);
    var merged = arr.sort().join('');
    var ret = merged.replace(CT.re_pair,"$1$2");
    return ret;
}


/** Returns the last known offset in the yarn, an empty string otherwise. */
CT.getYarnLength = function (weft2,yarnid) {
    if (!yarnid || yarnid.length!=1)
        throw "no yarn id provided";
    var pos = -1;
    while ( -1!=(pos=weft2.indexOf(yarnid,pos+1)) && (pos&1) );
    return pos!=-1 ? weft2[pos+1] : '/';
}


CT.prototype.getYarnLength = function (yarnid) {
    return CT.getYarnLength(this.getWeft2(),yarnid);
}

CT.prototype.getYarnAwarenessWeft2 = function (yarnid) {
    if (!this.awareness) this.awareness={};
    if (this.awareness[yarnid]) return this.awareness[yarnid];
    var len = this.getYarnLength(yarnid);
    if (!len) return "01";
    return this.awareness[yarnid]=this.closeWeft2(yarnid+len);
}

CT.prototype.getAwarenessWeftII = function (id) {
    if (this.weftsII[id]) return this.weftsII[id];
    var weft2 = this.closeWeft2(id);
    var weftII = this.convertWeft2toII(weft2);
    return this.weftsII[id]=weftII;
}

CT.re_chunk = CT.re("%m5|$1$2(?:($2)$1\\1)*$2");
CT.re_block = "($5*?)(($1)$2($I))(%!5*)(%@5*)((?:%<5%>5*)*)(%>5*)(?=$1($2)($2)|$)";
CT.re_causal_block = "^($5*?)($3$P)(%m5*)((?:$1$P$2$5*?)*)($1(?:$W)$2|$)";
CT.re_sibling_block = CT.re("$1($2)$2$5*?(?=$1\\1$2|$)");
/** I do not verify append-only/no dups in this method. */
CT.prototype.addPatch5c = function (patch5c) {
    if (!patch5c) return;
    this.getWeft2();
    var add = {};
    var rebubbling = [];
    var chunks = patch5c.match(CT.re_chunk).reverse();
    while (chunks.length) {
        var chunk = chunks.pop();
        var type = chunk[0];
        var prntid = chunk.substr(1,2);
        if (!add[prntid])
            add[prntid]={rm:'',un:'',ch:'',mr:'',aw:''};
        switch (chunk[0]) {
            case '\u0008': add[prntid].rm+=chunk; break;  // risk N2
            case '\u0015': add[prntid].un+=chunk; break;
            case '\u0005': add[prntid].mr+=chunk; break;
            case '\u0006': add[prntid].aw+=chunk; break;
            default      : add[prntid].ch+=chunk;
        }
    }
    function insert (all,pre,atom,sy,id,mr,aw,rmun,un,nxpr,nxid) {
        var ret = [pre]; // TODO: case of undel
        var a = add[id];
        ret.push(atom);
        ret.push(a.mr,mr);
        ret.push(a.aw,aw);
        ret.push(a.rm,rmun);
        ret.push(a.ch);
        if (a.ch) if (a.ch.length>5 || nxpr==id) // todo optimize
            rebubbling.push(id); // risk N2, do red flags
        delete add[id];
        return ret.join('');
    }
    var prev_count = 1<<30;
    var weave5c = this.weave5c;
    while (weave5c.length!=this.weave5c.length+patch5c.length) {
        var ids = [];
        for (id in add)
            ids.push(id);
        if (ids.length>=prev_count) throw "patching failed";
        prev_count = ids.length;
        var re_ins_id = CT.ids2re(ids.join(''));
        var re_inserts = CT.re(CT.re_block,{I:re_ins_id});
        weave5c = weave5c.replace(re_inserts,insert);
    }
    this.weave5c = weave5c;
    delete this.weft2; // todo opt
    this.deps4c = this.weave3 = this.text5c = this.text3 = this.text1 = undefined;
    var that = this;
    function rebubble (match,before,atom,meta,caused,after) {
        var siblings = caused.match(CT.re_sibling_block);
        function weftIIorder (a,b) {
            var ida = a.substr(3,2);
            var idb = b.substr(3,2);
            var wIIa = that.getAwarenessWeftII(ida);
            var wIIb = that.getAwarenessWeftII(idb);
            return wIIa > wIIb ? -1 : 1;
        }
        siblings.sort(weftIIorder);
        var ret = before+atom+meta+siblings.join('')+after;
        if (match%5 || ret%5)
            alert("alarm!");
        return ret;
    }
    while (rebubbling.length) {
        var prnt = rebubbling.pop();
        var prntesc = "(?:"+CT.escapeMeta(prnt)+')';
        var prnt_aw_weft = this.closeWeft2(prnt);
        var re_prnt_aw = CT.getFiltre(prnt_aw_weft);
        var re_causal = CT.re
            ( CT.re_causal_block, {'P':prntesc,'W':re_prnt_aw}, 'm' );
        this.weave5c = this.weave5c.replace(re_causal,rebubble);
        if (this.weave5c.length%5)
            alert("alarm!");
    }
}


CT.re_filter2 = "$F|(..)";
/** returns whether first weft covers the second */
CT.isCover = function (weft2sup, weft2sub) {
    var filtre = CT.re(CT.re_filter2,{'F':CT.getFiltre(weft2sup)});
    var remainder = weft2sub.replace(filtre,"$1");
    return remainder==='';
}


CT.prototype.re_hist = "($3(?:$V))|($5)";
/** Returns a CT object wrapping a historical version of the weave. */
CT.prototype.getVersion = function (weft2) {
    var re_fre = CT.re(this.re_hist, {'V':CT.getFiltre(weft2)});
    var weave5cver = this.weave5c.replace(re_fre,"$1");
    return new CT(weave5cver,this.id2url);
}


CT.re_vefi = CT.re("($2)($1)($2)");
CT.prototype.getTail5c = function (weft2) {
    var re_fre = CT.re(this.re_hist, {'V':CT.getFiltre(weft2,"li")});
    var weave5cver = this.weave5c.replace(re_fre,"$2");
    if (!weave5cver) return '';
    var permut = weave5cver.replace(CT.re_5,"$3$1$2");
    var atoms = permut.match(CT.re_vefi);
    var ret = atoms.sort().join('').replace(CT.re_vefi,"$2$3$1");
    return ret;
}


CT.prototype.re_form3 = CT.re("$3");
/** Takes patch3c, adds atom ids, adds the resulting patch5c.
    Note: patch3c is already position-independent, different from offset-
    content change specification. Still, patch3c mentions no own yarn ids
    or offsets. Thus it is perfect for sending changes to the server to let
    the server assign proper offsets and return patch5c. */
CT.prototype.convertPatch3cTo5c = function (patch3c, yarn_url) {
    if (!patch3c) return '';
    var yarn_id = yarn_url.length==1 ? yarn_url : this.url2id[yarn_url];
    if (!yarn_id)
        throw "unknown yarn url "+yarn_url; 
    var ylen = this.getYarnLength(yarn_id);
    var len = ylen ? ylen.charCodeAt(0) : 0x2f;
    var atoms = patch3c.match(this.re_form3);
    var form5c = [];
    for(var i=0; i<atoms.length; i++) {
        form5c.push(atoms[i].charAt(0));
        if (atoms[i].substr(1,2)==="01") { // spec val for "caused by prev"
            form5c.push(yarn_id);
            form5c.push(String.fromCharCode(len));
        } else 
            form5c.push(atoms[i].substr(1,2));
        form5c.push(yarn_id);
        form5c.push(String.fromCharCode(++len));
    }
    return form5c.join('');
}


CT.re_f = "($Y.)|..";
CT.weft2Covers = function (weft2, atom) {
    var re_fd = CT.re(CT.re_f,{'Y':atom[0]});
    var cover = weft2.replace(re_fd,"$1");
    return cover && cover[1]>=atom[1];
}


CT.re_1 = CT.re("($1)");
CT.re_3 = CT.re("($1)($2)");
/** Serialize text changes as a patch. Changes are detected using simple
  * heuristics (TODO: diff-match-patch). 
  * @param text1    the new text (including metasymbols)
  * @param yarn_url the URL identifying the author of the changes (optional)
  * @return         patch3c  */
CT.prototype.getPatch3c = function (text1, yarn_id) {
    var base = this;
    var base3 = base.getText3();
    var base1 = base.getText1();
    if (text1===base1)
        return '';
    var pref = Math.min(text1.length,base1.length);
    var pre = 0;
    while (pref>0) {
        if (base1.substr(0,pref)===text1.substr(0,pref)) {
            base1 = base1.substr(pref);
            text1 = text1.substr(pref);
            pre += pref;
        } else
            pref>>=1;
    }
    var postf = Math.min(text1.length,base1.length);
    while (postf>0) {
        if (base1.substr(base1.length-postf)===text1.substr(text1.length-postf)) {
            base1 = base1.substr(0,base1.length-postf);
            text1 = text1.substr(0,text1.length-postf);
        } else
            postf>>=1;
    }
    var changes3c = [];
    var that = this;
    function append_insertion (offset, text) {
        //sibling check goes here
        var cause = offset>0 ? base3.substr(offset*3+1-3,2) : "00";
        var sibl = offset*3<base3.length ? base3.substr(offset*3+4-3,2) : "01";
        //var w2 = yarn_id ? that.getYarnAwareness(yarn_id) : "01";
        //if (!CT.weft2Covers(w2,sibl))  // FIXME precache, amend
        if (sibl[0]!='0') if (!yarn_id || sibl[0]!=yarn_id) // optimization
            changes3c.push('\u0006'+sibl[0]+that.getYarnLength(sibl[0]));
        changes3c.push(text.charAt(0)+cause);
        changes3c.push(text.substr(1).replace(CT.re_1,"$101"));
    }
    function append_removal (offset, length) {
        var chunk = base3.substr(offset*3,length*3);
        changes3c.push(chunk.replace(CT.re_3,"\u0008$2"));
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
    return patch3c;
}


CT.prototype.addNewVersion = function (text1,yarn_url) {
    var patch3c = this.getPatch3c(text1);
    var patch5c = this.convertPatch3cTo5c(patch3c,yarn_url);
    this.addPatch5c(patch5c);
    return this.getWeft2();
}

CT.prototype.getYarnId = function (url_or_id) {
    if (url_or_id.length==1) return url_or_id;
    if (this.url2id[url_or_id])
        return this.url2id[url_or_id];
    throw "unknown yarn url "+url_or_id;
}

CT.re_pos = CT.re("$2",{},'');
CT.re_next5c = "^$5*?($1)$2(?:$A)%m5*$1($2)(($f)$o)";
CT.prototype.insertText = function (pos,text,author) {
    var yid = this.getYarnId(author);
    var re_pos = CT.re(CT.re_next5c,{'A':pos},'m');
    var details = this.weave5c.match(re_pos);
    if (!details || -1!="\u0008\u0015\u0006\u0005".indexOf(details[1]))
        throw "invalid pos: '"+pos+"'";
    var next_cause = details[2];
    var next_id = details[3];
    var next_feed = details[4];
    var patch3c = '';
    if (next_id===pos && next_feed!=yid)
        patch3c = "\u0006"+next_id; // right sibling awareness
    patch3c += text.substr(0,1) + pos;
    patch3c += text.substr(1).replace(CT.re_1,"$&01");
    var patch5c = this.convertPatch3cTo5c(patch3c,yid);
    this.addPatch5c(patch5c);
    return patch5c.substr(patch5c.length-2,2);
}

/** range bounds may point at dead atoms. */
CT.prototype.eraseText = function (range4,author) {
    var range3 = this.getText3Range(range4);
    var ids = range3.replace(CT.re_3,"$2");
    var patch3c = ids.replace(CT.re_2,"\u0008$&");
    if (this.leery) if (patch3c.length*2!=ids.length*3)
        throw "invalid id string: "+ids;
    var patch5c = this.convertPatch3cTo5c(patch3c,author);
    this.addPatch5c(patch5c);
}

CT.re_mark_pos = "(?:$1($2))?$!02(?:$1$P)?(?:$1($2))?";
/** Returns an id of a currently visible atom which is the left (right)
  * neighbor of the atom <i>aid</i> (aid may be a deleted atom as well). */
CT.prototype.getNextAtom2 = function (aid,is_prev) {
    if (this.leery) if (aid.length!=2 || !aid.match(CT.re_2))
        throw "invalid pos";
    var clone = this.clone();
    var patch5c = '\u0005'+aid+"02";
    clone.addPatch5c(patch5c);
    var re = CT.re(CT.re_mark_pos,{'P':aid},'m');
    var m = clone.getText3().match(re);
    return (m && m[is_prev?1:2]) || (is_prev?"00":"01");
}

CT.prototype.re_pickyarn = "($3)($Y.)|$5";
CT.prototype.re_improper5 = CT.re("($2)($1)($2)");
CT.prototype.getYarn5c = function (yarn_id) {
    if (this.leery && yarn_id.length!=1) throw "invalid yarn_id";
    var re = CT.re(this.re_pickyarn,{'Y':yarn_id});
    var atoms = this.weave5c.replace(re,"$2$1");
    var sorted = atoms.match(this.re_improper5).sort().join('');
    var form5c = sorted.replace(this.re_improper5,"$2$3$1");
    return form5c;
}

CT.re_range3 = "^$3*?($1(?:$I)$3*?)$1(?:$I)";
CT.prototype.getText3Range = function (range) {
    var re_ids = CT.ids2re(range);
    var re_rng = CT.re(CT.re_range3,{'I':re_ids},'m');
    var m = re_rng.exec(this.getText3());
    if (!m) return '';
    return m[1];
}


CT.re_white = "($1)(?:$F)|($1$f)$o";
CT.re_mark = CT.re("($10)|($1$f)0");
CT.re_weave3 = CT.re("$10$o%m3*|($3)(%!3*)%@3*(%x3*)");
//CT.prototype.re_scour = CT.re("$3$Z*?$<  $Z*|($3$Z*)");
CT.re_diff = CT.re([
                        "$X00%z3*?$<00%z3*",      // old, old deleted
                        "($X0)0%z3*?$<($f)$o%z3*",  // old, just deleted
                        "($X)00%z3*?(?:$>([^0])$o)+$<(0)0%z3*", // old del, undo
                        "($X00)%z3*",            // old, no changes
                        "$X..%z3*?$<..%z3*",      // phantom (new, just deleted)
                        "($X..)%z3*"             // new, still alive
                    ].join('|'));
CT.prototype.getHili3 = function (weft2) {
    var w3 = this.getWeave3();
    var w3prep = w3.replace(CT.re_weave3,"$2$1$3");
    var re_paint_white = CT.re(CT.re_white,{'F':CT.getFiltre(weft2)});
    var spaced = w3prep.replace(re_paint_white,"$1$20");
    var marked = spaced.replace(CT.re_mark,"$1$20");
    var weave_hili = marked.replace(CT.re_diff,"$1$2"+"$3$4$5"+"$6"+"$7");
    return weave_hili;
}


CT.prototype.getRevertChunk3c = function (chunk) {
    var rev_chunk3;
    if (chunk[0]=='\u0008') {
        rev_chunk3 = chunk.replace(this.re_form5c,"\u007F$2");
    } else if (chunk[0]=='\u007F') {
        // FIXME big pending issue in batch processing: awareness changes for >
        // FIXME Convention: signal awareness explicitly
        rev_chunk3 = chunk.replace(this.re_form5c,"\u0008$2");
    } else {
        rev_chunk3 = chunk.replace(this.re_form5c,"\u0008$3");
    }
    return rev_chunk3;
}

CT.prototype.re_span5c = "$5*?(.$2$B$5*.$2$E).*";
CT.prototype.re_point5c = "$5*?(.$2$B).*";
CT.prototype.re_yarn_chunk = CT.re("($<$4)+|($>$4)+|($5)+");
CT.prototype.getRevertSpan3c = function (span_int) {
    if (span_int.length!=4 || span_int[0]!=span_int[2]) throw "incorrect interval";
    var yarn5c = this.getYarn5c(span_int[0]);
    var b = span_int.substr(0,2);
    var e = span_int.substr(2,2);
    var spanre = CT.re( b==e?this.re_point5c:this.re_span5c, {'B':b,'E':e}, 'm' );
    var span = yarn5c.match(spanre);
    if (!span || !span[1]) throw "incorrect span specification";
    var chunks = span[1].match(this.re_yarn_chunk);
    var patch3c = [];
    for(var i=0; i<chunks.length; i++)
        patch3c.push (this.getRevertChunk3c(chunks[i]));
    return patch3c.join('');
}

CT.prototype.re_range = /^(.).\1.$/;
CT.prototype.rollbackChanges = function (range) {
    if (!range.match(this.re_range))
        throw "invalid range: "+range;
    var undo_patch = this.getRevertSpan3c(range);
    var patch5c = this.convertPatch3cTo5c(undo_patch,range[0]);
    this.addPatch5c(patch5c);
}

    
CT.testeq = function (must, is) {
        if (must!==is) {
            var msg = "equality test fail: must be '"+must+"' have '"+is+"'";
            CT.log(msg);
            arguments.__proto__.join = Array.prototype.join;
            for(var c = arguments.callee; c!=null; c=c.caller)
                CT.log(c.name+"\t("+c.arguments.join(',')+")");
            throw msg;
        }
}
CT.log = function (rec) {
        if (window) {
            var p = document.createElement("pre");
            p.appendChild(document.createTextNode(rec));
            document.body.appendChild(p);
        } else
            console.log(rec+"\n");
}

CT.selfCheck = function () {

    var testeq=CT.testeq;
    var log = CT.log;

    var four_authors = {'A':"Alice",'B':"Bob",'C':"Carol",'D':"Dave"};

    function testStatics () {
        testeq("1\\.2\\-3\\]",CT.escapeMeta("1.2-3]"));
        testeq("0[0-1]|A[0-\\?]|\\[[0-8]",CT.getFiltre("01A?[8"));
        testeq("0[^1-\uffff]|A[^\\?-\uffff]|\\[[^8-\uffff]",CT.getExFiltre("01A?[8"));
        testeq("01A2B3C4",CT.removeWeft2Redundancy("B301B2A0C400C1A2"));
        testeq('4',CT.getYarnLength("01A2B3C4",'C'));
        var re = CT.re( "abc$De$F", {'D':'d','F':'f'} );
        testeq(1," abcdef".search(re));
        testeq(true,CT.isCover("01A2B3C0","A2B1C0"));
        log("statics tests OK");
    }


    function testBasicCt () {
        var test = new CT('',four_authors);
        testeq("01",test.getWeft2());
        //testeq(test.allocateYarnCode(),"A");
        testeq("",test.getText1());
        testeq("01A/B/C/D/",test.getZeroWeftII());
        testeq("\u00010000\u00040001",test.getYarn5c('0'));
        // testeq(-1,test.compareWeft1("01","01A2")); TEST AS INCORR INPUT

        var v_te = test.addNewVersion("Te","Alice");
        //testeq("B",test.allocateYarnCode());
        testeq("Te",test.getText1());
        testeq("\x010000T00A0eA0A1\x040001",test.getWeave5c());
        testeq("00A0",test.getDeps4c());
        //testeq(-1,test.compareWeft1("01","01A2"));
        testeq("01A1",test.getYarnAwarenessWeft2("A"));

        var v_test = test.addNewVersion("Test","Alice");
        testeq("01A3",v_test);
        testeq("Test",test.getText1());

        var v_text = test.addNewVersion("Tekst","Bob");
        testeq("01A3B1",test.getWeft2());
        testeq("00A0A1B1A3B0",test.getDeps4c());
        //testeq(1,test.compareWeft1("01A4B1","01A4"));
        testeq("01A3B1",test.getYarnAwarenessWeft2("B")); // awareness decl
        testeq("01A3B1",test.closeWeft2("B1"));

        var w5c_test = test.getVersion(v_test);
        w5c_test.addNewVersion("Text","Carol");
        testeq("A3",w5c_test.getNextAtom2("A2",false));
        var p5c_tekxt = w5c_test.getTail5c(v_test);
        test.addPatch5c(p5c_tekxt);
        testeq("01A3B1C2",test.getWeft2());
        testeq("Tekxt",test.getText1());
        testeq("\u00010000T00A0eA0A1kA1B1xA1C2sA1A2\u0008A2C0tA2A3\u0006A3C1\u0006A3B0\u00040001",
               test.getWeave5c());
        //testeq(1,test.compareWeft1("01A4B1","01A4C2"));
        testeq("01A3B1",test.getYarnAwarenessWeft2("B")); // awareness decl

        log("basic functionality tests OK");
    }

    function testNewLine () {
        var nl = new CT('',four_authors);
        nl.addNewVersion("a\nb",'A');
        testeq("a\nb",nl.getText1());
        testeq("aA0\nA1bA2",nl.getText3());
        log("newline tsting OK");
    }

    function testBracing () {
        var braces = new CT('',four_authors);
        braces.addNewVersion("Text","Alice");
        testeq("Text",braces.getText1());
        var round = braces.addNewVersion("(Text)","Bob");
        testeq("(Text)",braces.getText1());
        braces.addNewVersion("[Text]","Carol"); // what actually happens
        testeq("[Text]",braces.getText1());
        var v = braces.getVersion(round);
        testeq("(Text)",v.getText1());
        log("bracing tests OK");
    }

    function testDiff () {
        var braces = new CT('',four_authors);
        var start = braces.addNewVersion("Text","Alice");
        var round = braces.addNewVersion("(Text)","Bob");
        braces.addNewVersion("Text","Carol");
        braces.addNewVersion("[Text]","Carol");
        testeq( "[C0(0CT00e00x00t00]C0)0C", braces.getHili3(round) );
        log("basic diff OK");
    }

    function testUndo () {
        var test = new CT('',four_authors);
        var start = test.addNewVersion("Text","Alice");
        var round = test.addNewVersion("Tezzzt","Bob");
        testeq("T00e00zB0zB0zB0x0Bt00",test.getHili3("01A3"));
        var undo_patch = test.getRevertSpan3c("B0B4");
        testeq("\u007FA2\bB1\bB2\bB3\bB4",undo_patch);
        var patch5c = test.convertPatch3cTo5c(undo_patch,"Bob");
        test.addPatch5c(patch5c);
        testeq("Text",test.getText1());
        testeq("T00e00x00t00",test.getHili3("01A3"));
        log("undo test OK");
    }

    // Open problem in method signature reengineering: know no yarn ->
    // don't know where to put ack marks TODO
    function testComplexDiff () {
        var test = new CT('',four_authors);
        test.addNewVersion("Tex","Alice");
        test.addNewVersion("TexNt","Alice");
        test.addNewVersion("Text","Alice");
        test.addNewVersion("TextZ","Alice");
        testeq('6',test.getYarnLength("A"));
        test.rollbackChanges("A6A6","Alice"); // TODO add redo/undo

        var line = test.getWeft2();

        test.addNewVersion("Tex!","Bob");
        test.addNewVersion("LaTex!","Bob");
        test.rollbackChanges("B2B2","Bob");
        
        var hili = test.getHili3(line);
        
        testeq("LB0aB0T00e00x00t0B",hili);
        
        log("complex diff test OK");
    }
    
    // concurrency test
    function testConcurrency () {
        var test = new CT('',four_authors);
        var base = test.addNewVersion("Test","Alice");
        testeq("Test",test.getText1());
        var fork1 = test.clone();
        var fork2 = test.clone();
        var fork3 = test.clone();
        var w1 = fork1.addNewVersion("Te3st","Dave");
        var w2 = fork2.addNewVersion("Te2st","Carol");
        var w3 = fork3.addNewVersion("Te1st","Bob");
        
        var p15 = fork1.getTail5c(base);
        var p25 = fork2.getTail5c(base);
        var p35 = fork3.getTail5c(base);
        
        test.addPatch5c(p15);
        test.addPatch5c(p25);
        test.addPatch5c(p35);
        testeq("Te123st",test.getText1());
        
        fork1.addPatch5c(p25);
        fork1.addPatch5c(p35);
        testeq("Te123st",fork1.getText1());
        
        fork2.addPatch5c(p35);
        fork2.addPatch5c(p15);
        testeq("Te123st",fork2.getText1());
        
        fork3.addPatch5c(p15);
        fork3.addPatch5c(p25);
        testeq("Te123st",fork3.getText1());
        
        log("concurrency test OK");
    }
    
    function testMultiplicationTable () {
        var pre = document.createElement("pre");
        document.body.appendChild(pre);
        var users = {'O':"grid"};
        var grid = '';
        var line = "|  |  |  |  |  |  |  |  |  |<br/>";
        for(var i=1; i<10; i++) {
            users[''+i] = '['+i+']';
            grid += line;
        }
        var ct = new CT('',users);
        ct.addNewVersion(grid,'O');
        var repos = [];
        for(var i=1; i<10; i++) {
            repos[i] = ct.clone();
        }
        var onefixlen = 5;
        var lv = String.fromCharCode( '0'.charCodeAt(0) + 9*onefixlen - 1 );
        var end_ver = "123456789".replace(/./g,"$&"+lv);
        end_ver = "01" + end_ver + 'O'+ct.getYarnLength('O');
        function advance (l) {
            var repo = repos[l];
            var ll = ''+l;
            //if (repo.getWeft2()===end_ver)
            //    return false;
            var pos = repo.getYarnLength(ll);
            var progress = pos ? (pos.charCodeAt(0)-'0'.charCodeAt(0)+1)/5 : 0;
            if (progress==9)
                return false;
            var next = progress+1;
            var offset = progress*line.length + l*3 -3 +1;
            var num = l*next;
            var ins = (num>9?'':'0') + num;
            var text =  repo.getText1().substr(0,offset) +
                        ins +
                        repo.getText1().substr(offset+2) ;
            repo.addNewVersion(text,ll);
            return true;
        }
        function pull (a,b) {
            var repoa = repos[a];
            var repob = repos[b];
            var base = CT.getCommonWeft2(repoa.getWeft2(),repob.getWeft2());
            var patch_b2a = repob.getTail5c(base);
            repoa.addPatch5c(patch_b2a);
        }
        
        var done = 0;
        while (done<9) {
            var a = Math.ceil(Math.random()*9);
            var b = Math.ceil(Math.random()*19);
            if (b>9)
                advance(a);
            else
                pull(a,b);
            pre.innerHTML = a+(b>9?'':" "+b)+"<br/>"+repos[a].getText1();
            done = 0;
            for(var i=1; i<=9; i++)
                if (repos[i].getWeft2()===end_ver)
                    done++;
        }
        //pre.parentNode.removeChild(pre);
        text3 = repos[1].getText3();
        for(var i=1; i<=9; i++)
            testeq(repos[i].getText3(),text3);
        log("multiplication table test OK");
    }
    
    // performance test
    function testPerformance () {
        var users = 
           {'A':"Alice",
            'B':"Bob",
            'C':"Carol",
            'D':"Dave",
            'E':"Emma",
            'F':"Fred",
            'G':"George",
            'H':"Hans",
            'I':"Ivan",
            'J':"Joost",
            'K':"Kevin",
            'L':"Lindiwe",
            'M':"Matt"};
        var ct = new CT('',users);
        while (ct.weave5c.length<5000000) {
            var patches = [];
            var text = ct.getText1();
            var start = ct.getWeft2();
            for(var yarn_id in users) {
                var coin = Math.random();
                var text_new = '';
                var hilichunk = '';
                if (coin<0.8) { // add some text
                    var len = Math.round(Math.random()*20);
                    var symb = [];
                    for(var i=0; i<len; i++)
                        symb.push(String.fromCharCode(Math.random()*30+0x61));
                    var add = symb.join('');
                    var pos = Math.random() * text.length;
                    var head = text.substring(0,text.length*pos);
                    var tail = text.substring(text.length*pos,text.length);
                    text_new = head + add + tail;
                    hilichunk = add.replace(/(.)/mg,"$1"+yarn_id+" ");
                } else {
                    var len = Math.round(Math.random()*20);
                    if (len>text.length)
                        len = text.length;
                    var off = Math.random() * (text.length-len);
                    var head = text.substring(0,off);
                    var deleted = text.substring(off,off+len);
                    var tail = text.substring(off+len,text.length);
                    text_new = head + tail;
                    hilichunk = deleted.replace(/(.)/mg,"$1 "+yarn_id);
                }
                var clone = ct.clone();
                clone.addNewVersion(text_new,users[i]);
                var p5c = clone.getTail5c(start);
                patches.push(p5c);
                chunks_sorted.push(hilichunk);
            }
            while (patches.length)
                ct.addPatch5c(patches.pop());
            var hili = ct.getHili3(start);
            hili = hili.replace(/.  |(...)/mg,"$1");
            var spit = hili.match(/.(..)(.\1)* /mg);
            split.sort();
            testeq(chunks_sorted,split);
        }
    }
    
    // incorrect input tests

    //try{
        testStatics();
        testBasicCt();
        testNewLine();
        testBracing();
        testDiff();
        //testUndo();
        //testComplexDiff();
        testConcurrency();
        testMultiplicationTable();
        //testPerformance();
    //}catch(e){
    //    log(e);
    //}

}

/** big fixme: the entire thing is a bit +-1 fragile, need strict spec and tests */
