/*
 * dc-lite — a minimal standalone renderer for the ward sensory monitor screens.
 *
 * The screens were authored on a design canvas that provides three template
 * primitives: {{dotted.path}} holes, <sc-for list as> repeats and <sc-if value>
 * branches, all fed by a renderVals() method on a Component class. This file
 * reimplements just those primitives so the same markup runs as an ordinary
 * web page with no build step and no dependencies.
 *
 * Event bindings arrive as data-on-click="{{handler}}" (rewritten at build time
 * from onClick, so the browser never tries to parse the hole as inline script).
 */
(function () {
  'use strict';

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }

  DCLogic.prototype.setState = function (patch) {
    var key;
    for (key in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        this.state[key] = patch[key];
      }
    }
    window.__dcRender();
  };

  DCLogic.prototype.forceUpdate = function () {
    window.__dcRender();
  };

  window.DCLogic = DCLogic;

  function lookup(scope, path) {
    path = String(path).trim();
    if (path === 'true') { return true; }
    if (path === 'false') { return false; }
    var parts = path.split('.');
    var value = scope;
    for (var i = 0; i < parts.length; i++) {
      if (value === null || value === undefined) { return undefined; }
      value = value[parts[i]];
    }
    return value;
  }

  var WHOLE = /^\{\{([^}]+)\}\}$/;
  var ANY = /\{\{([^}]+)\}\}/g;

  function interpolate(text, scope) {
    return text.replace(ANY, function (match, path) {
      var value = lookup(scope, path);
      return value === null || value === undefined ? '' : String(value);
    });
  }

  // A <template> parses any fragment faithfully, including bare <tr> rows that
  // a <div> would silently discard.
  function parseFragment(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = html;
    return tpl.content;
  }

  function childScope(parent, name, value, index) {
    var scope = Object.create(parent);
    scope[name] = value;
    scope.$index = index;
    return scope;
  }

  function render(node, scope) {
    var children = Array.prototype.slice.call(node.childNodes);

    for (var i = 0; i < children.length; i++) {
      var child = children[i];

      if (child.nodeType === 3) {
        if (child.nodeValue.indexOf('{{') !== -1) {
          child.nodeValue = interpolate(child.nodeValue, scope);
        }
        continue;
      }

      if (child.nodeType !== 1) { continue; }

      var tag = child.tagName.toLowerCase();

      if (tag === 'sc-for') {
        var list = lookup(scope, (child.getAttribute('list') || '').replace(WHOLE, '$1'));
        var alias = child.getAttribute('as') || 'item';
        var inner = child.innerHTML;
        var repeated = document.createDocumentFragment();
        if (Array.isArray(list)) {
          for (var j = 0; j < list.length; j++) {
            var pass = parseFragment(inner);
            render(pass, childScope(scope, alias, list[j], j));
            repeated.appendChild(pass);
          }
        }
        child.parentNode.replaceChild(repeated, child);
        continue;
      }

      if (tag === 'sc-if') {
        var keep = lookup(scope, (child.getAttribute('value') || '').replace(WHOLE, '$1'));
        if (keep) {
          var branch = parseFragment(child.innerHTML);
          render(branch, scope);
          child.parentNode.replaceChild(branch, child);
        } else {
          child.parentNode.removeChild(child);
        }
        continue;
      }

      var attrs = Array.prototype.slice.call(child.attributes);
      for (var k = 0; k < attrs.length; k++) {
        var name = attrs[k].name;
        var raw = attrs[k].value;
        if (raw.indexOf('{{') === -1) { continue; }
        var whole = raw.match(WHOLE);

        if (name.indexOf('data-on-') === 0) {
          child.removeAttribute(name);
          var handler = whole ? lookup(scope, whole[1]) : null;
          if (typeof handler === 'function') {
            child.addEventListener(name.slice('data-on-'.length), handler);
          }
          continue;
        }

        if (whole) {
          var value = lookup(scope, whole[1]);
          child.setAttribute(name, value === null || value === undefined ? '' : String(value));
        } else {
          child.setAttribute(name, interpolate(raw, scope));
        }
      }

      render(child, scope);
    }
  }

  var root = null;
  var template = '';
  var instance = null;

  function paint() {
    var fragment = parseFragment(template);
    render(fragment, instance.renderVals());
    while (root.firstChild) { root.removeChild(root.firstChild); }
    root.appendChild(fragment);
  }

  window.__dcRender = paint;

  window.__dcBoot = function () {
    root = document.getElementById('dc-root');
    template = root.innerHTML;
    /* global Component */
    instance = new Component(window.__dcProps || {});
    paint();
  };
}());
