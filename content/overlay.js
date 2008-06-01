/*
 * Copyright (c) 2008 László Bácsi <teatime@lackac.name>
 *
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 * */

var teatime = {
  onLoad: function() {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("teatime-strings");

    try {
      var button = "teatime-toolbar-button";
      var firefoxnav = document.getElementById("navigation-toolbar");
      var curSet = firefoxnav.currentSet;
      if (curSet.indexOf(button) == -1)
      {
        var set;
        // Place the button before the urlbar
        if (curSet.indexOf("urlbar-container") != -1)
          set = curSet.replace(/urlbar-container/, "urlbar-container,"+button);
        else  // at the end
          set = firefoxnav.currentSet + "," + button;
        firefoxnav.setAttribute("currentset", set);
        firefoxnav.currentSet = set;
        document.persist("navigation-toolbar", "currentset");
        // If you don't do the following call, funny things happen
        try {
          BrowserToolboxCustomizeDone(true);
        }
        catch (e) { }
      }
    }
    catch(e) { }
  },

  onToolbarButtonCommand: function(event) {
    var list = teatime.readingList();
    if (list.length > 0) {
      var i = Math.floor(list.length*Math.random());
      teatime.read(list[i].id, event);
    } else {
      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                    .getService(Components.interfaces.nsIPromptService);
      promptService.alert(window, this.strings.getString("nothingToReadTitle"),
                                  this.strings.getString("nothingToRead"));
    }
  },

  readingList: function() {
    var table = {};

    var hsvc = Components.classes["@mozilla.org/browser/nav-history-service;1"]
                         .getService(Components.interfaces.nsINavHistoryService);
    var options = hsvc.getNewQueryOptions();

    var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
                          .getService(Components.interfaces.nsINavBookmarksService);

    var qUnfiled = hsvc.getNewQuery();
    qUnfiled.setFolders([bmsvc.unfiledBookmarksFolder], 1);
    var result = hsvc.executeQuery(qUnfiled, options);

    var rootNode = result.root;
    rootNode.containerOpen = true;
    for (var i = 0; i < rootNode.childCount; i++) {
      var bm = rootNode.getChild(i);
      if (bm.itemId > 0) table[bm.itemId] = bm.title;
    }
    rootNode.containerOpen = false;

    var tsvc = Components.classes["@mozilla.org/browser/tagging-service;1"]
                         .getService(Components.interfaces.nsITaggingService);
    var later = tsvc.getURIsForTag("later");
    for (var i = 0; i < later.length; i++) {
      var bm = later[i];
      var q = hsvc.getNewQuery();
      q.uri = bm;
      var result = hsvc.executeQuery(q, options);

      var rootNode = result.root;
      rootNode.containerOpen = true;
      if (rootNode.childCount > 0) {
        bm = rootNode.getChild(0);
        if (bm.itemId > 0) table[bm.itemId] = bm.title;
      }
      rootNode.containerOpen = false;
    }

    var list = [];
    for (var id in table) {
      list.push({id: id, title: table[id]});
    }
    return list;
  },

  read: function(id, event) {
    var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
                          .getService(Components.interfaces.nsINavBookmarksService);
    var uri = bmsvc.getBookmarkURI(id);

    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.teatime.");
    var deleteRead = prefs.getBoolPref("deleteRead");

    openUILink(uri.spec, event, false, true);
    if (deleteRead) {
      var tsvc = Components.classes["@mozilla.org/browser/tagging-service;1"]
                           .getService(Components.interfaces.nsITaggingService);
      var tags = tsvc.getTagsForURI(uri, {});
      if (tags.indexOf("later") != -1) {
        tsvc.untagURI(uri, ["later"], 1);
      } else {
        bmsvc.removeItem(id);
      }
    }
  },

  populateReadingList: function() {
    var list = teatime.readingList();

    pageList = document.getElementById("teatime-reading-list");
    teatime.clearReadingList(pageList, 'list-item');

    var maxItems = 75;

    for (var i = 0; i < list.length; i++) {
      var bm = list[i];
      var item = document.createElement("menuitem");
      item.setAttribute("label", bm.title);
      item.setAttribute("oncommand", "teatime.read("+bm.id+", event); event.stopPropagation();");
      item.setAttribute("onclick", "checkForMiddleClick(this, event);");
      item.setAttribute("class", 'list-item');
      pageList.appendChild(item);
      if (i == maxItems) { break; }
    }
  },

  clearReadingList: function(menu, class) {
    for (var i = menu.childNodes.length - 1; i >= 0; i--) {
      if (!class || menu.childNodes[i].className == class) {
        menu.removeChild(menu.childNodes[i]);
      }
    } 
  }

};
window.addEventListener("load", function(e) { teatime.onLoad(e); }, false);
