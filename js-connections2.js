(function() {
  HTMLElement.prototype.connections = function(options) {
    if (options === "update") {
      return processConnections(update, this);
    } else if (options === "remove") {
      return processConnections(destroy, this);
    } else {
      options = Object.assign(
        {
          borderClasses: {},
          class: "connection",
          css: {},
          from: this,
          tag: "connection",
          to: this,
          within: document.documentElement
        },
        options
      );
      connect(options);
      return this;
    }
  };

  const connect = function(options) {
    const { borderClasses, tag, from, to, within } = options;
    const end1 = Array.isArray(from) ? from : [from];
    const end2 = Array.isArray(to) ? to : [to];
    const withinElements = within instanceof HTMLElement ? [within] : Array.from(document.querySelectorAll(within));
    const connectionOptions = { ...options };

    delete connectionOptions.borderClasses;
    delete connectionOptions.tag;
    delete connectionOptions.from;
    delete connectionOptions.to;
    delete connectionOptions.within;

    withinElements.forEach(container => {
      const processed = new Set();
      end1.forEach(node => {
        processed.add(node);
        end2.filter(n => !processed.has(n)).forEach(target => {
          createConnection(container, [node, target], tag, borderClasses, connectionOptions);
        });
      });
    });
  };

  const createConnection = function(container, nodes, tag, borderClasses, options) {
    const css = Object.assign({ position: "absolute" }, options.css);
    const connection = document.createElement(tag);
    Object.assign(connection.style, css);
    connection.className = options.class;
    container.appendChild(connection);

    const border_w = (connection.offsetWidth - connection.clientWidth) / 2 || 1;
    const border_h = (connection.offsetHeight - connection.clientHeight) / 2 || 1;

    const data = {
      borderClasses,
      border_h,
      border_w,
      node_from: nodes[0],
      node_to: nodes[1],
      nodes_dom: nodes,
      css
    };

    if (getComputedStyle(connection).borderTopStyle === "none") {
      data.css.borderStyle = "solid";
    }

    connection._connectionData = data;
    nodes.forEach(node => {
      if (!node._connections) node._connections = [];
      node._connections.push(connection);
    });

    update(connection);
  };

  const destroy = function(connection) {
    const { nodes_dom } = connection._connectionData;
    nodes_dom.forEach(node => {
      node._connections = node._connections.filter(c => c !== connection);
    });
    connection.remove();
  };

  const getState = function(data) {
    data.rect_from = data.node_from.getBoundingClientRect();
    data.rect_to = data.node_to.getBoundingClientRect();
    const cached = data.cache;
    data.cache = [
      data.rect_from.top,
      data.rect_from.right,
      data.rect_from.bottom,
      data.rect_from.left,
      data.rect_to.top,
      data.rect_to.right,
      data.rect_to.bottom,
      data.rect_to.left
    ];
    data.hidden = data.cache.every(val => val === 0);
    data.unmodified = cached ? data.cache.every((v, i) => v === cached[i]) : false;
  };

  const update = function(connection) {
    const data = connection._connectionData;
    getState(data);
    if (data.unmodified) return;

    const { border_h, border_w, rect_from: from, rect_to: to } = data;
    let b = (from.bottom + from.top) / 2;
    let r = (to.left + to.right) / 2;
    let t = (to.bottom + to.top) / 2;
    let l = (from.left + from.right) / 2;

    const h = l > r ? ["left", "right"] : ["right", "left"];
    const v = t > b ? ["top", "bottom"] : ["bottom", "top"];

    if (l > r) {
      const x = Math.max(r - border_w / 2, Math.min(from.right, to.right));
      r = l + border_w / 2;
      l = x;
    } else {
      l -= border_w / 2;
      r = Math.min(r + border_w / 2, Math.max(from.left, to.left));
    }

    if (t > b) {
      const x = Math.max(b - border_h / 2, Math.min(from.bottom, to.bottom));
      b = t + border_h / 2;
      t = x;
    } else {
      b = Math.min(b, Math.max(from.top, to.top));
      t -= border_h / 2;
    }

    const width = r - l;
    const height = b - t;
    const style = `
      border-${v[0]}-${h[0]}-radius: 0;
      border-${v[0]}-${h[1]}-radius: 0;
      border-${v[1]}-${h[0]}-radius: 0;
      ${width <= 0 || height <= 0 ? `border-${v[1]}-${h[1]}-radius: 0;` : ""}
      display: ${data.hidden ? "none" : "block"};
    `;

    Object.assign(data.css, {
      left: `${l}px`,
      top: `${t}px`,
      width: `${Math.max(0, width - border_w)}px`,
      height: `${Math.max(0, height - border_h)}px`
    });

    connection.setAttribute("style", style);
    Object.assign(connection.style, data.css);
  };

  const processConnections = function(method, elements) {
    (elements instanceof HTMLElement ? [elements] : elements).forEach(element => {
      if (Array.isArray(element._connections)) {
        element._connections.forEach(connection => method(connection));
      }
    });
  };
})();