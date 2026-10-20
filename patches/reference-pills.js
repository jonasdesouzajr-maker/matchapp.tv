/* MatchApp text surfaces. Decorate existing nodes; never replace text or controls. */
(function () {
  'use strict';
  if (window.MatchAppTextPills || !document.documentElement.classList.contains('ma-reference') || /^\/(kids|private-voice|oauth|android-studio)(\/|$)/.test(location.pathname)) return;
  var textAttribute = 'data-ma-text-pill';
  var controlAttribute = 'data-ma-control-pill';
  var excluded = 'script,style,noscript,template,svg,math,canvas,iframe,object,embed,audio,video,[contenteditable]:not([contenteditable="false"]),[data-ma-pill-exclude],ins.adsbygoogle,[data-ad-slot],[data-ad-client],[data-ad-unit],[data-ad-container],.adsbygoogle,.ma-ad-slot,.ad-slot,.ad-container,.ad-unit,.ma-sponsored-slot,[id^="google_ads"],[id^="aswift_"]';
  var field = 'input,select,textarea,option,optgroup,datalist';
  var control = 'button,a[href],summary,[role="button"],[role="tab"],[role="menuitem"]';
  var semantic = 'h1,h2,h3,h4,h5,h6,p,label,legend,figcaption,caption,dt,dd,blockquote,address,pre,output,td,th,li';
  var brand = '.ma-brand-copy,.ma-wordmark,.ebook-text-wordmark,.mh-title,.ma-brand-name';
  var structural = /^(HTML|BODY|MAIN|SECTION|ARTICLE|NAV|FORM|TABLE|THEAD|TBODY|TFOOT|TR|UL|OL|DL)$/;
  var frame = 0;
  var pending = new Set();

  function excludedNode(element) {
    return !element || !!element.closest(excluded);
  }
  function covered(element) {
    return element && element.closest('[' + textAttribute + '],[' + controlAttribute + ']:not([' + controlAttribute + '="card"])');
  }
  function artCard(element) {
    return element && (element.matches('.ref-editorial-banner,.ref-topic,.marquee-item,.poster-card,.book-card,[data-watch-title-card]') || (element.matches('a[href]') && !!element.querySelector('img,picture,h1,h2,h3,h4,h5,h6,figcaption')));
  }
  function type(element) {
    if (/^H[1-6]$/.test(element.tagName)) return 'title';
    if (element.matches('label,legend,dt')) return 'label';
    if (element.matches('figcaption,caption,[class*="caption"],.marquee-title,.book-title,[data-title-caption]')) return 'caption';
    if (element.matches('small,time,.eyebrow,[class*="eyebrow"],.badge,[class*="badge"],.ma-brand-copy,.ma-wordmark,.ebook-text-wordmark,.mh-title,.ma-brand-name')) return 'micro';
    if (element.matches('p,li,dd,blockquote,address,pre,output,td,th')) return 'copy';
    if (element.querySelector('button,a[href],input,select,textarea,details,p,div,section,article,ul,ol,fieldset')) return 'group';
    return 'loose';
  }
  function mark(element, attribute, value) {
    if (!element || excludedNode(element) || element.matches(field)) return;
    var parentPill = covered(element.parentElement);
    if (parentPill) return;
    if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value);
    if (element.closest('.premium-ad-frame,.ad-banner-container,.sidebar-ad-left,.sidebar-ad-right')) element.setAttribute('data-ma-pill-ad-label', '');
    // An entire heading, sentence or control owns its inline emphasis/links.
    if (attribute === controlAttribute && value === 'card') return;
    element.querySelectorAll('[' + textAttribute + '],[' + controlAttribute + ']:not([' + controlAttribute + '="card"])').forEach(function (child) {
      child.removeAttribute(textAttribute);
      child.removeAttribute(controlAttribute);
    });
  }
  function owner(text) {
    var parent = text.parentElement;
    if (!parent || excludedNode(parent)) return;
    var nativeField = parent.closest(field);
    if (nativeField) return; // Native field text is already enclosed by its field.
    var action = parent.closest(control);
    var card = artCard(action);
    if (card) mark(action, controlAttribute, 'card');
    var related=parent.closest('.music-video-caption,.music-cover-header,.ma-result-trust__label');
    if(related){mark(related,textAttribute,related.matches('.ma-result-trust__label')?'label':'group');return;}
    // A caption and its native field are two surfaces, not a pill around a
    // second pill. Reuse an existing caption node; direct Text-child contracts
    // and toggle labels deliberately retain their original owner.
    var fieldLabel=parent.closest('label');
    if(fieldLabel&&fieldLabel.querySelector('select,textarea,input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"])')&&!Array.from(fieldLabel.childNodes).some(function(node){return node.nodeType===Node.TEXT_NODE&&/\S/.test(node.nodeValue||'');})){
      var caption=parent;while(caption.parentElement&&caption.parentElement!==fieldLabel)caption=caption.parentElement;
      if(caption!==fieldLabel&&!caption.querySelector(field)){
        fieldLabel.removeAttribute(textAttribute);fieldLabel.setAttribute('data-ma-pill-field-group','');
        mark(caption,textAttribute,'label');return;
      }
    }
    if (covered(parent)) return;
    // Keep the approved logo pixels separate from the rounded wordmark surface.
    var wordmark = parent.closest(brand);
    if (wordmark) { mark(wordmark, textAttribute, 'micro'); return; }
    var heading = parent.closest('h1,h2,h3,h4,h5,h6');
    if (heading) { mark(heading, textAttribute, 'title'); return; }
    var textOwner = parent.closest(semantic);
    // A paragraph containing a source link is one reading pill. A paragraph
    // inside a button belongs to that existing button instead.
    if (action && !card && (!textOwner || action.contains(textOwner))) {
      mark(action, controlAttribute, ''); return;
    }
    if (textOwner) { mark(textOwner, textAttribute, type(textOwner)); return; }
    if (card && parent !== action) { mark(parent, textAttribute, parent.matches('.ref-editorial-sub') ? 'label' : type(parent)); return; }
    if (action) { mark(action, controlAttribute, ''); return; }
    // Legacy copy often lives in an existing span/div/footer rather than a p.
    // Reuse it so firstChild references and live translations keep their nodes.
    if (!structural.test(parent.tagName)) {
      mark(parent, textAttribute, type(parent)); return;
    }
    // A rare text run directly under a structural root has no safe text owner.
    // A span preserves the actual Text node, while the root layout stays intact.
    var span = document.createElement('span');
    span.className = 'ma-loose-text-pill';
    span.setAttribute(textAttribute, 'loose');
    span.setAttribute('data-ma-pill-inline', 'true');
    text.replaceWith(span); span.appendChild(text);
  }
  function scan(root) {
    if (!root || !root.isConnected) return;
    if (root.nodeType === Node.TEXT_NODE) {
      if (/\S/.test(root.nodeValue || '')) owner(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || excludedNode(root)) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        return /\S/.test(node.nodeValue || '') && !excludedNode(node.parentElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    // Collect first: only the rare structural text case inserts a span.
    var nodes = [], next;
    while ((next = walker.nextNode())) nodes.push(next);
    nodes.forEach(owner);
    // Plain reading lists have no layout gap of their own. Existing flex/grid
    // catalogs, action rows, fields and protected inventory retain their owners.
    (root.matches('ul,ol')?[root].concat(Array.from(root.querySelectorAll('ul,ol'))):Array.from(root.querySelectorAll('ul,ol'))).forEach(function(list){
      if(excludedNode(list)||covered(list)||list.closest('.premium-ad-frame,.ad-banner-container,.sidebar-ad-left,.sidebar-ad-right'))return;
      var items=Array.from(list.children);
      if(items.length>1&&items.every(function(item){return item.tagName==='LI'&&item.hasAttribute(textAttribute);})&&getComputedStyle(list).display==='block')list.setAttribute('data-ma-pill-reading-list','');
    });
  }
  function flush() {
    frame = 0;
    var roots = Array.from(pending); pending.clear();
    roots.forEach(function (root) {
      if (!roots.some(function (other) { return other !== root && other.nodeType === Node.ELEMENT_NODE && other.contains(root); })) scan(root);
    });
  }
  function schedule(root) {
    if (!root) return;
    pending.add(root);
    if (!frame) frame = requestAnimationFrame(flush);
  }
  function start() {
    if (!document.body) return;
    scan(document.body);
    var observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === 'characterData') schedule(record.target);
        else record.addedNodes.forEach(function (node) {
          if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) schedule(node);
        });
      });
    });
    observer.observe(document.body, {subtree:true, childList:true, characterData:true});
    window.MatchAppTextPills.observer = observer;
  }
  window.MatchAppTextPills = {scan:scan, refresh:function () { schedule(document.body); }};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
})();
