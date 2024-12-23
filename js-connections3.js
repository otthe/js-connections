HTMLElement.prototype.connections = function (options) {
  if (options === "update") {
    return processConnections(updateConnection, this);
  } else if (options === "destroy") {
    return processConnections(destroyConnection, this);
  } else {
    options = Object.assign(
      {
        borderClasses: {},
        class: "connection",
        css: {},
        from: this,
        tag: "connection",
        to: this,
        within: document.documentElement//document.body,
      },
      options
    );
    //console.log(this.connections);
    connect(options);
    return this;
  }

  function connect(options) {
    let end1 = options.from instanceof HTMLElement
      ? [options.from]
      : Array.from(document.querySelectorAll(options.from));

    let end2 = options.to instanceof HTMLElement
      ? [options.to]
      : Array.from(document.querySelectorAll(options.to));

    let within = options.within instanceof HTMLElement
      ? [options.within]
      : Array.from(document.querySelectorAll(options.within));

    console.log(end1);
    console.log(end2);
    console.log(within);

    within.forEach((container) => {
      const done = new Set();
      end1.forEach((node1) => {
        done.add(node1);
        end2
          .filter((node2) => !done.has(node2))
          .forEach((node2) => {
            createConnection(container, [node1, node2], options.tag, options.borderClasses, options);
          });
      });
    });
  }

  function createConnection(container, nodes, tag, borderClasses, options) {
    // if(console){
    //   for(i=0;i<arguments.length;console.log(arguments[i]),i++);
    // }

    // console.log(nodes);

    const connection = document.createElement(tag);
    Object.assign(connection.style, {position: 'absolute', ...options.css});

    container.appendChild(connection);

    const computedStyle = window.getComputedStyle(connection);
    const borderW = parseFloat(computedStyle.borderLeftWidth) || 1;
    const borderH = parseFloat(computedStyle.borderTopWidth) || 1;

    const data = {
      borderClasses,
      border_h: borderH,
      border_w: borderW,
      node_from: nodes[0],
      node_to: nodes[1],
      nodes_dom: nodes,
      css: { ...options.css },
    };

    if (computedStyle.borderTopStyle === 'none') {
      data.css.borderStyle = 'solid';
    }

    connection._connectionData = data;

    nodes.forEach((node) => {
      node._connections = node._connections || [];
      node._connections.push(connection);
    });

    update(connection);

    return connection;
  }

  function getState(data) {
    data.rect_from = data.nodes_dom[0].getBoundingClientRect();
    data.rect_to = data.nodes_dom[1].getBoundingClientRect();
    var cached = data.cache;
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
    data.hidden =
      0 === (data.cache[0] | data.cache[1] | data.cache[2] | data.cache[3]) ||
      0 === (data.cache[4] | data.cache[5] | data.cache[6] | data.cache[7]);
    data.unmodified = true;
    if (cached === undefined) {
      return (data.unmodified = false);
    }
    for (var i = 0; i < 8; i++) {
      if (cached[i] !== data.cache[i]) {
        return (data.unmodified = false);
      }
    }
  }

  function update(connection) {
    const data = connection._connectionData;
    console.log(data);

    // connection.style.display = "block";
    // connection.style.visibility = "visible";
    // connection.style.opacity = "1";

    getState(data);

    if (data.unmodified) {
      return;
    }

    const { rect_from: from, rect_to: to, borderClasses: bc } = data;
    let border_h = data.border_h || 1;
    let border_w = data.border_w || 1;

    let b = (from.bottom + from.top) / 2;
    let r = (to.left + to.right) / 2;
    let t = (to.bottom + to.top) / 2;
    let l = (from.left + from.right) / 2;

    let h = ["right", "left"];
    if (l > r) {
      h = ["left", "right"];
      const x = Math.max(r - border_w / 2, Math.min(from.right, to.right));
      r = l + border_w / 2;
      l = x;
    } else {
      l -= border_w / 2;
      r = Math.min(r + border_w / 2, Math.max(from.left, to.left));
    }

    let v = ["bottom", "top"];
    if (t > b) {
      v = ["top", "bottom"];
      const x = Math.max(b - border_h / 2, Math.min(from.bottom, to.bottom));
      b = t + border_h / 2;
      t = x;
    } else {
      b = Math.min(b, Math.max(from.top, to.top));
      t -= border_h / 2;
    }

    let width = r - l;
    let height = b - t;
    if (width < border_w) {
      t = Math.max(t, Math.min(from.bottom, to.bottom));
      b = Math.min(b, Math.max(from.top, to.top));
      l = Math.max(from.left, to.left);
      r = Math.min(from.right, to.right);
      r = l = (l + r - border_w) / 2;
    }
    if (height < border_h) {
      l = Math.max(l, Math.min(from.right, to.right));
      r = Math.min(r, Math.max(from.left, to.left));
      t = Math.max(from.top, to.top);
      b = Math.min(from.bottom, to.bottom);
      b = t = (t + b - border_h) / 2;
    }

    width = r - l;
    height = b - t;
    if (width <= 0) border_h = 0;
    if (height <= 0) border_w = 0;

    let style = `
      border-${v[0]}-${h[0]}-radius: 0;
      border-${v[0]}-${h[1]}-radius: 0;
      border-${v[1]}-${h[0]}-radius: 0;
    `;
    if (border_h <= 0 || border_w <= 0) {
      style += `border-${v[1]}-${h[1]}-radius: 0;`;
    }

    if (data.hidden) {
      style += "display: none;";
    } else {
      // data.css = {
      //   ...data.css,
      //   [`border-${v[0]}-width`]: 0,
      //   [`border-${h[0]}-width`]: 0,
      //   [`border-${v[1]}-width`]: border_h,
      //   [`border-${h[1]}-width`]: border_w,
      // };
      data.css = {
        ...data.css,
        [`border-${v[0]}-width`]: "0", // Only set non-visual borders to 0
        [`border-${h[0]}-width`]: "0",
        [`border-${v[1]}-width`]: `${border_h}px`, // Use the calculated border width
        [`border-${h[1]}-width`]: `${border_w}px`,
        borderRadius: "50%",
      };

      const currentRect = connection.getBoundingClientRect();
      Object.assign(data.css, {
        left: `${connection.offsetLeft + l - currentRect.left}px`,
        top: `${connection.offsetTop + t - currentRect.top}px`,
        width: `${width - border_w}px`,
        height: `${height - border_h}px`,
      });
    }

    Object.assign(connection.style, data.css);
    connection.style.cssText += style;

    connection.classList.remove(bc[v[0]], bc[h[0]]);
    connection.classList.add(bc[v[1]], bc[h[1]]);
  }

  function processConnections(method, element) {
    if (!element._connections || element._connections.length === 0) {
      console.warn("No connections found for this element.");
      return;
    }
  
    // Apply the specified method to each connection
    element._connections.forEach((connection) => {
      method(connection);
    });
  }

  function updateConnection(connection) {
    const data = connection._connectionData;
    if (!data) {
      console.error("No data found for this connection.");
      return;
    }
    update(connection); // Call the update function already defined in your code
  }
  
  // Destroy function passed to processConnections
  function destroyConnection(connection) {
    const data = connection._connectionData;
    if (!data) {
      console.error("No data found for this connection.");
      return;
    }
  
    // Remove the connection from the DOM
    connection.remove();
  
    // Clean up references in connected nodes
    data.nodes_dom.forEach((node) => {
      if (node._connections) {
        node._connections = node._connections.filter((conn) => conn !== connection);
      }
    });
  }
}