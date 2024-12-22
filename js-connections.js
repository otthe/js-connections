HTMLElement.prototype.connections = function(options) {
  console.log(options.target);
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
  
    // Process the `within` containers and create connections
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
    
    const connection = document.createElement(tag || "div");
  }
}


const d1 = document.getElementById("one");
const d2 = document.getElementById("two");
const d3 = document.getElementById("three");

const options = {
  to: d2
}

d1.connections(options);
