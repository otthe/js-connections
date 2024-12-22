HTMLElement.prototype.connections = function(options) {
  console.log(options.target);

  const connectionsMap = new WeakMap();
  const connectionDataMap = new WeakMap();

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
        within: document.body
      },
      options
    );
    connect(options);
    return this;
  }

  function connect(options) {
    console.log(options);
    // const end1 = Array.isArray(options.from) ? options.from : [options.from];
    // const end2 = Array.isArray(options.to) ? options.to : [options.to];
    // const within = Array.isArray(options.within) ? options.within : [options.within];

    let end1 = options.from instanceof HTMLElement
      ? [options.from]
      : Array.from(document.querySelectorAll(options.from));

    let end2 = options.to instanceof HTMLElement
      ? [options.to]
      : Array.from(document.querySelectorAll(options.to));

    let within = options.within instanceof HTMLElement
      ? [options.within]
      : Array.from(document.querySelectorAll(options.within));

    delete options.from;
    delete options.to;
    delete options.within;

    console.log(end1, end2);
  
    within.forEach(container => {
      const done = new Set();
      end1.forEach(node1 => {
        done.add(node1);
        end2.filter(node2 => !done.has(node2)).forEach(node2 => {
          createConnection(container, [node1, node2], options.tag, options.borderClasses, options);
        });
      });
    });
  }

  function createConnection(container, nodes, tag, borderClasses, options) {
    const [from, to] = nodes;

    console.log("from:", from, "to:", to);
    
    const connection = document.createElement(tag || "div");
    connection.className = options.class;
    Object.assign(connection.style, {
      position: "absolute",
      pointerEvents: "none", // ensures that it doesnt block interactions
      ...options.css
    });

    container.appendChild(connection);

    //update(connection, from, to, borderClasses);

    // connection.dataset.connectionData = JSON.stringify( {
    //   //cant store objects like this with stringify, 
    //   //we have to use weakmap or something else for referencing
    //   // node_from: from,
    //   // node_to: to,
    //   // node_from: from instanceof HTMLElement ? from : null,
    //   // node_to: to instanceof HTMLElement ? to : null,
    //   container,
    //   options,
    //   borderClasses,
    // });

    connectionDataMap.set(connection, {
      node_from: from,
      node_to: to,
      container,
      options,
      borderClasses,
    });

    update(connection);

    // Optionally store a reference to this connection in the `from` and `to` elements
    storeConnection(from, connection);
    storeConnection(to, connection);

    console.log(getConnections());
  }

  function storeConnection(element, connection) {
    if (!connectionsMap.has(element)) {
      connectionsMap.set(element, []);
    }
    connectionsMap.get(element).push(connection);
  }

  function getConnections() {
    return connectionsMap.get(element) || [];
  }
  function update(connection) {
    // Retrieve connection data from the WeakMap
    const data = connectionDataMap.get(connection);
    if (!data) {
      console.error("No data found for connection", connection);
      return;
    }
  
    // Update the state of the connection
    getState(data);
  
    if (data.unmodified) {
      return; // Skip if nothing has changed
    }
  
    const { rect_from: from, rect_to: to, borderClasses: bc } = data;
    let border_h = data.border_h || 1; // Default border height
    let border_w = data.border_w || 1; // Default border width
  
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
  
    // Create the style string for the connection
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
      data.css = {
        ...data.css,
        [`border-${v[0]}-width`]: 0,
        [`border-${h[0]}-width`]: 0,
        [`border-${v[1]}-width`]: border_h,
        [`border-${h[1]}-width`]: border_w,
      };
  
      const currentRect = connection.getBoundingClientRect();
      Object.assign(data.css, {
        left: `${connection.offsetLeft + l - currentRect.left}px`,
        top: `${connection.offsetTop + t - currentRect.top}px`,
        width: `${width - border_w}px`,
        height: `${height - border_h}px`,
      });
    }
  
    // Apply styles
    Object.assign(connection.style, data.css);
    connection.style.cssText += style;
  
    // Update border classes
    connection.classList.remove(bc[v[0]], bc[h[0]]);
    connection.classList.add(bc[v[1]], bc[h[1]]);
  }

  function getState(data) {
    console.log(data);

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
      data.rect_to.left,
    ];
  
    data.hidden =
      (data.cache[0] | data.cache[1] | data.cache[2] | data.cache[3]) === 0 ||
      (data.cache[4] | data.cache[5] | data.cache[6] | data.cache[7]) === 0;
  
    data.unmodified = cached && data.cache.every((val, idx) => val === cached[idx]);
  }
}


const d1 = document.getElementById("one");
const d2 = document.getElementById("two");
const d3 = document.getElementById("three");

// d1.connections({
//   to: '#two'
// });

d2.connections({
  to: '#three',
  class: 'related',
}) 
