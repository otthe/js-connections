HTMLElement.prototype.connections = function (options) {
  const connectionsMap = new Map();//WeakMap();
  const connectionDataMap = new Map();//WeakMap();

  if (options === "update") {
    return processConnections(update, this);
  } else if (options === "destroy") {
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
        within: document.body,
      },
      options
    );
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

    delete options.from;
    delete options.to;
    delete options.within;

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
    const [from, to] = nodes;
  
    // Check for existing connections
    const existingConnections = getConnections(from).filter((conn) => {
      const connData = connectionDataMap.get(conn);
      return connData && connData.node_to === to && connData.container === container;
    });
  
    if (existingConnections.length > 0) {
      console.warn("Connection already exists between", from, "and", to);
      return;
    }
  
    // Create the connection element
    const connection = document.createElement(tag || "div");
  
    // Sanitize class before any further processing
    const sanitizedClass = (options.class || "").split(" ").filter(Boolean).join(" ");
    console.log("Sanitized connection class before update:", sanitizedClass);
  
    // Set initial data in connectionDataMap
    connectionDataMap.set(connection, {
      node_from: from,
      node_to: to,
      container,
      options: { ...options, class: sanitizedClass }, // Ensure class is sanitized here
      borderClasses,
    });
  
    // Assign sanitized class to connection
    connection.className = sanitizedClass;
  
    // Apply styles
    Object.assign(connection.style, {
      position: "absolute",
      pointerEvents: "none",
      ...options.css,
    });
  
    // Append the connection to the container
    container.appendChild(connection);
  
    // Call update after connectionDataMap is set
    update(connection);
  
    // Store the connection for both nodes
    storeConnection(from, connection);
    storeConnection(to, connection);
  }
  


  function storeConnection(element, connection) {
    if (!connectionsMap.has(element)) {
      connectionsMap.set(element, []);
      console.log("Element added correctly to connectionsMap!");
    }
  
    const connections = connectionsMap.get(element);
    console.log("Current connections:", connections);
  
    if (!connections.includes(connection)) {
      connections.push(connection);
      console.log("Connection added successfully:", connection);
    }
  }

  function getConnections(element) {
    return connectionsMap.get(element) || [];
  }

  function update(connection) {
    const data = connectionDataMap.get(connection);
    if (!data) {
      console.error("No data found for connection", connection);
      return;
    }

    if (!document.body.contains(data.node_from) || !document.body.contains(data.node_to)) {
      console.error("Connected nodes are no longer in the DOM");
      return;
    }

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

    Object.assign(connection.style, data.css);
    connection.style.cssText += style;

    connection.classList.remove(bc[v[0]], bc[h[0]]);
    connection.classList.add(bc[v[1]], bc[h[1]]);
  }

  function getState(data) {
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

  function processConnections(method, element) {
    console.log(element);
    const connections = getConnections(element);
    console.log(connections);
    connections.forEach((connection) => {
      method(connection);
    });
  }

  function destroy(connection) {
    const data = connectionDataMap.get(connection);
    if (!data) {
      console.error("No data found for connection", connection);
      return;
    }

    const { node_from, node_to } = data;
    [node_from, node_to].forEach((node) => {
      const connections = getConnections(node);
      const updatedConnections = connections.filter((conn) => conn !== connection);
      if (updatedConnections.length > 0) {
        connectionsMap.set(node, updatedConnections);
      } else {
        connectionsMap.delete(node);
      }
    });

    connection.remove();
    connectionDataMap.delete(connection);
  }
};



// HTMLElement.prototype.connections = function(options) {
//   const connectionsMap = new WeakMap();
//   const connectionDataMap = new WeakMap();

//   if (options === "update") {
//     return processConnections(update, this);
//   } else if (options === "remove") {
//     return processConnections(destroy, this);
//   } else {
//     options = Object.assign(
//       {
//         borderClasses: {},
//         class: "connection",
//         css: {},
//         from: this,
//         tag: "connection",
//         to: this,
//         within: document.body
//       },
//       options
//     );
//     connect(options);
//     return this;
//   }

//   function connect(options) {
//     console.log(options);

//     let end1 = options.from instanceof HTMLElement
//       ? [options.from]
//       : Array.from(document.querySelectorAll(options.from));

//     let end2 = options.to instanceof HTMLElement
//       ? [options.to]
//       : Array.from(document.querySelectorAll(options.to));

//     let within = options.within instanceof HTMLElement
//       ? [options.within]
//       : Array.from(document.querySelectorAll(options.within));

//     delete options.from;
//     delete options.to;
//     delete options.within;

//     console.log(end1, end2);
  
//     within.forEach(container => {
//       const done = new Set();
//       end1.forEach(node1 => {
//         done.add(node1);
//         end2.filter(node2 => !done.has(node2)).forEach(node2 => {
//           createConnection(container, [node1, node2], options.tag, options.borderClasses, options);
//         });
//       });
//     });
//   }

//   // function connect(options) {
//   //   console.log(options);
  
//   //   let end1 = options.from instanceof HTMLElement
//   //     ? [options.from]
//   //     : Array.from(document.querySelectorAll(options.from));
  
//   //   let end2 = options.to instanceof HTMLElement
//   //     ? [options.to]
//   //     : Array.from(document.querySelectorAll(options.to));
  
//   //   let within = options.within instanceof HTMLElement
//   //     ? [options.within]
//   //     : Array.from(document.querySelectorAll(options.within));
  
//   //   delete options.from;
//   //   delete options.to;
//   //   delete options.within;
  
//   //   console.log(end1, end2);
  
//   //   within.forEach(container => {
//   //     end1.forEach(node1 => {
//   //       end2.forEach(node2 => {
//   //         createConnection(container, [node1, node2], options.tag, options.borderClasses, options);
//   //       });
//   //     });
//   //   });
//   // }

//   // function createConnection(container, nodes, tag, borderClasses, options) {
//   //   const [from, to] = nodes;
  
//   //   console.log("from:", from, "to:", to);
  
//   //   const connection = document.createElement(tag || "div");
  
//   //   // Ensure options.class is valid and does not include undefined
//   //   const className = options.class ? options.class.trim() : ""; 
//   //   console.log(className);
//   //   connection.className = className;
  
//   //   Object.assign(connection.style, {
//   //     position: "absolute",
//   //     pointerEvents: "none", // Ensures that it doesn’t block interactions
//   //     ...options.css,
//   //   });
  
//   //   container.appendChild(connection);
  
//   //   connectionDataMap.set(connection, {
//   //     node_from: from,
//   //     node_to: to,
//   //     container,
//   //     options,
//   //     borderClasses,
//   //   });
  
//   //   update(connection);
  
//   //   // Store reference to this connection in the `from` and `to` elements
//   //   storeConnection(from, connection);
//   //   storeConnection(to, connection);
  
//   //   console.log("Created connection:", connection);
//   // }

//   function createConnection(container, nodes, tag, borderClasses, options) {
//     const [from, to] = nodes;
  
//     const existingConnections = getConnections(from).filter(conn => {
//       const connData = connectionDataMap.get(conn);
//       return connData && connData.node_to === to && connData.container === container;
//     });
  
//     if (existingConnections.length > 0) {
//       console.warn("Connection already exists between", from, "and", to);
//       return; // Skip creating duplicate connection
//     }
  
//     const connection = document.createElement(tag || "div");
//     connection.className = options.class.trim();
//     Object.assign(connection.style, {
//       position: "absolute",
//       pointerEvents: "none",
//       ...options.css,
//     });
  
//     container.appendChild(connection);
  
//     connectionDataMap.set(connection, {
//       node_from: from,
//       node_to: to,
//       container,
//       options,
//       borderClasses,
//     });
  
//     update(connection);
  
//     storeConnection(from, connection);
//     storeConnection(to, connection);
  
//     console.log("Created connection:", connection);
//   }

//   // function storeConnection(element, connection) {
//   //   if (!connectionsMap.has(element)) {
//   //     connectionsMap.set(element, []);
//   //   }
//   //   const connections = connectionsMap.get(element);
//   //   connections.push(connection);
//   //   console.log('Stored connection:', connection, 'for element:', element, connections);
//   // }

//   // function storeConnection(element, connection) {
//   //   if (!connectionsMap.has(element)) {
//   //     connectionsMap.set(element, []);
//   //   }
//   //   const connections = connectionsMap.get(element);
//   //   if (!connections.includes(connection)) {
//   //     connections.push(connection);
//   //     console.log('Stored connection:', connection, 'for element:', element, connections);

//   //   }
//   // }
//   function storeConnection(element, connection) {
//     if (!connectionsMap.has(element)) {
//       connectionsMap.set(element, []);
//     }
//     const connections = connectionsMap.get(element);
//     if (!connections.includes(connection)) {
//       connections.push(connection);
//       console.log('Stored connection:', connection, 'for element:', element, connections);
//     }
//   }
  

//   function getConnections(element) {
//     return connectionsMap.get(element) || [];
//   }
//   function update(connection) {
//     //retrieve connection data from the WeakMap
//     const data = connectionDataMap.get(connection);
//     if (!data) {
//       console.error("No data found for connection", connection);
//       return;
//     }

//     if (!document.body.contains(data.node_from) || !document.body.contains(data.node_to)) {
//       console.error('connected nodes are no longer in the DOM');
//       return;
//     }
  
//     // update state of the connection
//     getState(data);
  
//     if (data.unmodified) {
//       return; // skip calcs if nothing has changed
//     }
  
//     const { rect_from: from, rect_to: to, borderClasses: bc } = data;
//     let border_h = data.border_h || 1; // default bh
//     let border_w = data.border_w || 1; // default bw
  
//     let b = (from.bottom + from.top) / 2;
//     let r = (to.left + to.right) / 2;
//     let t = (to.bottom + to.top) / 2;
//     let l = (from.left + from.right) / 2;
  
//     let h = ["right", "left"];
//     if (l > r) {
//       h = ["left", "right"];
//       const x = Math.max(r - border_w / 2, Math.min(from.right, to.right));
//       r = l + border_w / 2;
//       l = x;
//     } else {
//       l -= border_w / 2;
//       r = Math.min(r + border_w / 2, Math.max(from.left, to.left));
//     }
  
//     let v = ["bottom", "top"];
//     if (t > b) {
//       v = ["top", "bottom"];
//       const x = Math.max(b - border_h / 2, Math.min(from.bottom, to.bottom));
//       b = t + border_h / 2;
//       t = x;
//     } else {
//       b = Math.min(b, Math.max(from.top, to.top));
//       t -= border_h / 2;
//     }
  
//     let width = r - l;
//     let height = b - t;
//     if (width < border_w) {
//       t = Math.max(t, Math.min(from.bottom, to.bottom));
//       b = Math.min(b, Math.max(from.top, to.top));
//       l = Math.max(from.left, to.left);
//       r = Math.min(from.right, to.right);
//       r = l = (l + r - border_w) / 2;
//     }
//     if (height < border_h) {
//       l = Math.max(l, Math.min(from.right, to.right));
//       r = Math.min(r, Math.max(from.left, to.left));
//       t = Math.max(from.top, to.top);
//       b = Math.min(from.bottom, to.bottom);
//       b = t = (t + b - border_h) / 2;
//     }
  
//     width = r - l;
//     height = b - t;
//     if (width <= 0) border_h = 0;
//     if (height <= 0) border_w = 0;
  
//     // create style string for the connection
//     let style = `
//       border-${v[0]}-${h[0]}-radius: 0;
//       border-${v[0]}-${h[1]}-radius: 0;
//       border-${v[1]}-${h[0]}-radius: 0;
//     `;
//     if (border_h <= 0 || border_w <= 0) {
//       style += `border-${v[1]}-${h[1]}-radius: 0;`;
//     }
  
//     if (data.hidden) {
//       style += "display: none;";
//     } else {
//       data.css = {
//         ...data.css,
//         [`border-${v[0]}-width`]: 0,
//         [`border-${h[0]}-width`]: 0,
//         [`border-${v[1]}-width`]: border_h,
//         [`border-${h[1]}-width`]: border_w,
//       };
  
//       const currentRect = connection.getBoundingClientRect();
//       Object.assign(data.css, {
//         left: `${connection.offsetLeft + l - currentRect.left}px`,
//         top: `${connection.offsetTop + t - currentRect.top}px`,
//         width: `${width - border_w}px`,
//         height: `${height - border_h}px`,
//       });
//     }
  
//     // aply styles
//     Object.assign(connection.style, data.css);
//     connection.style.cssText += style;
  
//     // Update border classes
//     connection.classList.remove(bc[v[0]], bc[h[0]]);
//     connection.classList.add(bc[v[1]], bc[h[1]]);
//   }

//   function getState(data) {
//     console.log(data);

//     data.rect_from = data.node_from.getBoundingClientRect();
//     data.rect_to = data.node_to.getBoundingClientRect();
  
//     const cached = data.cache;
//     data.cache = [
//       data.rect_from.top,
//       data.rect_from.right,
//       data.rect_from.bottom,
//       data.rect_from.left,
//       data.rect_to.top,
//       data.rect_to.right,
//       data.rect_to.bottom,
//       data.rect_to.left,
//     ];
  
//     data.hidden =
//       (data.cache[0] | data.cache[1] | data.cache[2] | data.cache[3]) === 0 ||
//       (data.cache[4] | data.cache[5] | data.cache[6] | data.cache[7]) === 0;
  
//     data.unmodified = cached && data.cache.every((val, idx) => val === cached[idx]);
//   }

//   function processConnections(method, element)  {
//     console.log(element);
//     const connections = getConnections(element);
//     console.log(connections);
//     connections.forEach(connection => {
//       method(connection);
//     });
//   }
 
//   // function destroy(connection) {
//   //   console.log(connection);
//   //   const data = connectionDataMap.get(connection);
//   //   if (!data) {
//   //     console.error('no data found for connection',connection);
//   //     return;
//   //   }

//   //   const {node_from, node_to} = data;
//   //   [node_from, node_to].forEach(node => {
//   //     const connections = getConnections(node);
//   //     const updatedConnections = connections.filter(conn => conn !== connection);
//   //     connectionsMap.set(node, updatedConnections);
//   //   });

//   //   connection.remove();
//   //   connectionDataMap.delete(connection);
//   // }
//   function destroy(connection) {
//     const data = connectionDataMap.get(connection);
//     if (!data) {
//       console.error('No data found for connection', connection);
//       return;
//     }
  
//     const { node_from, node_to } = data;
//     [node_from, node_to].forEach(node => {
//       const connections = getConnections(node);
//       const updatedConnections = connections.filter(conn => conn !== connection);
//       if (updatedConnections.length > 0) {
//         connectionsMap.set(node, updatedConnections);
//       } else {
//         connectionsMap.delete(node); // Clean up empty references
//       }
//     });
  
//     connection.remove();
//     connectionDataMap.delete(connection);
//   }
// }
