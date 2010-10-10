/** CTRE-backed deep hypertext implementation.
    to be used as the Controller part of a MVC
    construct (ctre is Model, browser is View) */

function DHYT () {
    this.ct;
    this.selection = '0000';
    this.author;
}

DHYT.prototype.getNextLeft = function (pos) {
}

DHYT.prototype.insertText = function (text) {
    if (!this.sel.empty())
        this.remove();
    ct.insert(this.sel.end(),text,this.author);
}

DHYT.prototype.remove = function (back) {
    if (this.selection.empty()) {
        if (back)
            this.ct.remove(this.ct.getText1Prev(this.sel.end()));
        else
            this.ct.remove(this.sel.end());
    } else {
        this.ct.remove(this.sel);
    }
}

DHYT.prototype.addChain = function (type,chain) {
    this.ct.insert("00",type+":\t"+chain+"\n");
}

DHYT.prototype.removeFromChain = function (chain_id,id) {
    var rm_range = this.getChains()[chain_id].range;
    if (id)
        rm_range = this.ct.findSubstring(rm_range,id);
    this.ct.remove(rm_range);
}

DHYT.prototype.addToChain = function (chain_id,id) {
    // find prev
    this.ct.insert(prev_id,id,this.author);
}

DHYT.re_split = CT.re("(.$I)$3*?");
DHYT.prototype.toHTML = function (range) {
    range = range || "0001";
    // parse headers
    // list split points
    var splits = [];
    splits.push(this.selection.toString());
    var hili_borders;
    splits.push(hili_borders);
    for(var id in headers)
        splits.push(headers[id].chain);
    // make regex
    var rex = CT.pos2regex(splits.join(''));
    // split
    var chunks = body3.match(DHYT.re_split);
    chunks = chunks.reverse();
    // go through
    while (chunks.length) {
        var chunk = chunks.pop();
        var id = chunk.substr(1,2);
        var chain = chains[id];  // chain.type etc
        // well, we do not know yet whether it is begin, end or comma
        var mode;
        // process structurals: insert tags
        if (structurals[chain.type]) {
            html.push('<');
            if (mode==='e')
                html.push('/');
            if (mode==='b') {
                html.push(" id='");
                htlm.push(id);
                html.push("' ");
            }
            html.push(structurals[chain.type].tag[mode!=='c']);
            html.push(">");
        } else { // amend style
            if (mode==='b')
                styles[id] = chain.type;
            else if (mode==='e')
                delete styles[id];
        }
        var style = styles.join(' ');
        html.push("<span style='");
        html.push(style);
        html.push("'>");
        html.push(chunk_html);
        html.push("</span>");
    }
}
