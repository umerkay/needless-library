const Sketches = {
    all: [],
    curr: null,
    paused: true,
    loopFunction: null,

    stopLoop() {
        this.paused = true;
    },

    doLoop(f) {
        this.loop(f);
    },

    loop(f) {
        this.paused = false;
        if (typeof f == "function") {
            this.loopFunction = f;
            f();
        }
        requestAnimationFrame(Sketches.update);
        return this;
    },

    update() {
        if (Sketches.paused) return;
        if (typeof Sketches.loopFunction == "function") Sketches.loopFunction();

        Sketches.forEach((sketch) => {
            if (!sketch._paused) {
                sketch._loop_main();
            }
        });
        clearGlobal();
        requestAnimationFrame(Sketches.update);
    },

    forEach(f) {
        this.all.forEach(f);
    },

    push(sketch) {
        this.all.push(sketch);
    },

    getSketch(name) {
        return this.all.filter(sketch => sketch.name === name)[0];
    },

    keyPressed(f) {
        if (typeof f == "function") {
            document.body.addEventListener("keydown", (evt) => {
                f(evt.key);
            });
        } else {
            throw new Error("Function required by method. Got " + typeof f);
        }
    },

    // on(event, f) {
    //     if (typeof f == "function") {
    //         document.body.addEventListener(event, () => {
    //             f();
    //         });
    //     } else {
    //         throw new Error("Function required by method. Got " + typeof f);
    //     }
    //     return this;
    // }
}

class Sketch {
    constructor({
        width = 400,
        height = width,
        container,
        layers = 1,
        frameRate = 30,
        scaleX = 1,
        scaleY = scaleX,
        autoplay = true,
        push = true
    } = {}) {
        //own mouse object literal with values relative to self
        this.mouse = {
            position: new Vector(0, 0),
            downPos: new Vector(0, 0),
            down: false,
            button: -1,
            isDown() {
                return this.button != -1;
            }
        };
        this.layers = 0;

        if (push != false) Sketches.push(this);
        this._paused = !autoplay;

        this.width = width; this.height = height;
        this.frameRate(frameRate);

        //#region
        //build canvases as required in the container
        this.canvases = [];
        this.ctxs = []; this.currentCtx = null;
        if (container) {
            if (container instanceof HTMLDivElement) this.container = container;
            else this.container = document.getElementById(container);
        } else {
            this.container = document.createElement('div');
            this.container.id = "sketch-" + (Sketches.all.length);
            document.body.appendChild(this.container);
        }
        if (!this.container) {
            throw new Error("Invalid container for sketch");
        }
        this.container.style.display = "inline-block";

        if (this.width == "inherit") {
            this.width = this.container.clientWidth;
        } else {
            this.container.style.width = this.width + "px";
        }

        if (this.height == "inherit") {
            this.height = this.container.clientHeight;
        } else {
            this.container.style.height = this.height + "px";
        }

        //bind name for accessing
        this.name = this.container.id || "sketch-" + (Sketches.all.length);
        this.mouse.name = this.name;

        //mouse events for every sketch
        this.container.addEventListener("mousemove", (evt) => {
            let rect = this.container.getBoundingClientRect();
            this.mouse.position.x = Math.floor((evt.clientX - rect.left));
            this.mouse.position.y = Math.floor((evt.clientY - rect.top));
        });
        this.container.addEventListener("mousedown", (evt) => {
            this.mouse.button = evt.button;
            this.mouse.downPos.set(this.mouse.position.x, this.mouse.position.y);
        });
        this.container.addEventListener("mouseup", (evt) => {
            this.mouse.button = -1;
        });
        //#endregion

        //add canvases if not already full
        for (let i = this.canvases.length; i < layers; i++) this.addCanvas();
        //default rectangle draw mode
        this.rectMode("CENTER");
        this.ctxs.forEach(ctx => ctx.scale(scaleX, scaleY));

        this.colorMode(0);

    }

    init(f) {
        this._init = f || this._init;
        if (f) {
            fetchIntoGlobal(this);
            f.bind(this)();
            clearGlobal();
        }

        return this;
    }

    setLoop(f) {
        if (typeof f != "function") throw new Error("setLoop requires function as first parameter, got " + typeof f);
        return this._loop = f;
    }

    loop(f) {
        this._loop = f || this._loop;

        this._fpsInterval = 1000 / this.fps;
        this._then = Date.now();
        this._frameCount = 0;

        return this;
    }

    _loop_main() {
        const now = Date.now();
        this._elapsed = now - this._then;

        if (this._elapsed > this._fpsInterval) {

            this._frames++;
            if (this._t0 != Math.floor(performance.now() / 1000)) {
                this._frames_last = this._frames;
                this._frames = 0;
                this._t0 = Math.floor(performance.now() / 1000);
            }
            this._then = now - (this._elapsed % this._fpsInterval);
            this._frameCount++;

            fetchIntoGlobal(this);
            this.ctxs.forEach(ctx => ctx.save());
            this._loop();
            this.ctxs.forEach(ctx => ctx.restore());

        }
    }

    stopLoop(duration) {
        this._paused = true;
        if (typeof duration == "number") setTimeout(sketch => sketch.doLoop(), duration, this);
    }

    doLoop() {
        this._paused = false;
    }

    addCanvas(canvas) {
        if (!canvas) { //if canvas not passed, create new
            canvas = document.createElement('canvas');
            canvas.id = "db-" + (this.canvases.length + 1);
            this.container.appendChild(canvas);
        }
        //set width height
        canvas.width = this.width;
        canvas.height = this.height;
        //set canvas methods
        canvas.onselectstart = () => false;

        canvas.style.position = 'absolute';

        let ctx = canvas.getContext("2d");
        this.canvases.push(canvas);
        this.layers++;
        this.ctxs.push(ctx);
        this.currentCtx = ctx;
        return canvas;
    }

    //#region

    setLayer(layer) {
        this.currentCtx = this.ctxs[layer];
    }

    loopCount() {
        return this._frameCount;
    }

    frameRate(fps) {
        if (fps) {
            this.fps = fps;
            this._fpsInterval = 1000 / this.fps;
        }
        else return this._frames_last;
    }

    clearAll() {
        this.ctxs.forEach(ctx => ctx.clearRect(0, 0, this.width, this.height));
    }

    clear() {
        this.currentCtx.clearRect(0, 0, this.width, this.height);
    }

    background(r, g, b, a) {
        if (r instanceof HTMLImageElement) {
            this.rectMode("CORNER");
            this.image(r, 0, 0, this.width, this.height);
            return;
        }
        this.save();
        this.fill(r, g, b, a);
        this.noStroke();
        this.rectMode("CENTER");
        this.rect(this.width / 2, this.height / 2, this.width, this.height);
        this.restore();
    }

    rect(x, y, w, h) {

        let ctx = this.currentCtx;
        if (this.currentCtx.doFill != false)
            ctx.fillRect(x - w * this.offset, y - h * this.offset, w, h);
        if (this.currentCtx.doStroke != false)
            ctx.strokeRect(x - w * this.offset, y - h * this.offset, w, h);
    }

    line(x1, y1, x2, y2) {
        this.currentCtx.beginPath();
        this.currentCtx.moveTo(x1, y1);
        this.currentCtx.lineTo(x2, y2);
        this.currentCtx.stroke();
    }

    rectMode(mode) {
        switch (mode) {
            case "CENTER":
                this.offset = 1 / 2;
                break;
            case "CORNER":
                this.offset = 0;
                break;
        }
    }

    stroke(r, g, b, a) {
        if ((r === null || r === undefined) && r !== 0) return this.noStroke();
        this._set("strokeStyle", r, g, b, a);
        this.currentCtx.doStroke = true;
    }

    fill(r, g, b, a) {
        if ((r === null || r === undefined) && r !== 0) return this.noFill();
        this._set("fillStyle", r, g, b, a);
        this.currentCtx.doFill = true;
    }

    _set(property, r, g, b, a) {
        if (typeof r == 'string') this.currentCtx[property] = r;
        else if (typeof r == 'number') {
            if (this._colormode == 'hsl')
                this.currentCtx[property] = `${this._colormode}a(${r}, ${typeof b == 'number' ? g : r}%, ${typeof b == 'number' ? b : r}%, ${typeof a == 'number' ? a : ((typeof g == 'number' && typeof b != 'number') ? g : 1)})`;
            else
                this.currentCtx[property] = `${this._colormode}a(${r}, ${typeof b == 'number' ? g : r}, ${typeof b == 'number' ? b : r}, ${typeof a == 'number' ? a : ((typeof g == 'number' && typeof b != 'number') ? g : 1)})`;
        }
        else if (typeof r == 'object') {
            if (r.mode == 'hsl')
                this.currentCtx[property] = `hsla(${r.h}, ${r.s}, ${r.l}, ${r.a})`;
            else
                this.currentCtx[property] = `rgba(${r.r}, ${r.g}, ${r.b}, ${r.a})`;
        }
    }

    colorMode(mode) {
        if (mode === 0 || mode == "rgb") this._colormode = "rgb";
        else if (mode === 1 || mode == "hsl") this._colormode = "hsl";
    }

    strokeWeight(weight) {
        this.currentCtx.lineWidth = weight;
        this.currentCtx.doStroke = true;
    }

    noStroke() {
        this.currentCtx.doStroke = false;
    }

    noFill() {
        this.currentCtx.doFill = false;
    }

    loadImage(src) {
        let img = new Image();
        img.onload = () => {

        };
        img.src = src;
        return img;
    }

    image(img, x, y, w, h) {
        if (w != null && h != null) {
            this.currentCtx.drawImage(img, x, y, w, h);
        } else {
            this.currentCtx.drawImage(img, x, y);
        }
    }

    ellipse(x, y, w, h = w) {
        this.currentCtx.beginPath();
        this.currentCtx.ellipse(x, y, w, h, 0, 0, TWO_PI);
        if (this.currentCtx.doFill != false) {
            this.currentCtx.fill();
        }
        if (this.currentCtx.doStroke != false) {
            this.currentCtx.stroke();
        }
        this.currentCtx.closePath();
    }

    circle(x, y, r) {
        this.currentCtx.beginPath();
        this.currentCtx.ellipse(x, y, r, r, 0, 0, TWO_PI);
        if (this.currentCtx.doFill != false) {
            this.currentCtx.fill();
        }
        if (this.currentCtx.doStroke != false) {
            this.currentCtx.stroke();
        }
        this.currentCtx.closePath();
    }

    arc(x, y, w, s, e) {
        this.currentCtx.beginPath();
        this.currentCtx.arc(x, y, w / 2, s, e);
        if (this.currentCtx.doFill != false) {
            this.currentCtx.fill();
        }
        if (this.currentCtx.doStroke != false) {
            this.currentCtx.stroke();
        }
        this.currentCtx.closePath();
    }

    text(string, x, y) {
        this.currentCtx.textAlign = "center";
        this.currentCtx.font = "bold 15px Arial";
        this.currentCtx.fillText(string, x, y + 15 / 3);
    }

    save() {
        this.currentCtx.save();
    }

    restore() {
        this.currentCtx.restore();
    }

    translate(x, y) {
        this.currentCtx.translate(x, y);
    }

    rotate(angle) {
        this.currentCtx.rotate(angle);
    }

    scale(x, y = x) {
        this.currentCtx.scale(x, y);
    }
    //#endregion

    on(event, f) {
        if (typeof f == "function") {
            this.container.addEventListener(event, () => {
                fetchIntoGlobal(this);
                f.bind(this)();
                clearGlobal();
            });
        } else {
            throw new Error("Function required by method. Got " + typeof f);
        }
        return this;
    }
}

const key = {
    states: [],
    isDown(key) {
        return !!this.states[key];
    }
};

window.onload = () => {
    document.body.addEventListener("keydown", evt => key.states[evt.key] = true);
    document.body.addEventListener("keyup", evt => key.states[evt.key] = false);
};

var mouse = null;
var width = window.innerWidth; var height = window.innerHeight;

function Color(r, g, b, a) {
    return { mode: 'rgb', r, g: (typeof b == 'number' ? g : r), b: (typeof b == 'number' ? b : r), a: (typeof a == 'number' ? a : ((typeof g == 'number' && typeof b != 'number') ? g : 1)) }
}
function hueColor(h, s, l, a) {
    return { mode: 'hsl', h, s: (typeof l == 'number' ? s : h) + '%', l: (typeof l == 'number' ? l : h) + '%', a: (typeof a == 'number' ? a : ((typeof s == 'number' && typeof l != 'number') ? s : 1)) }
}

function loadImage(src, f) {
    var img = new Image();
    img.onload = f;
    img.src = src;
    return img;
}

function fetchIntoGlobal(sketch) {
    Sketches.curr = sketch;
    mouse = Sketches.curr.mouse;
    width = Sketches.curr.width;
    height = Sketches.curr.height;
}

function clearGlobal() {
    mouse = null;
    width = window.innerWidth;
    height = window.innerHeight;
    Sketches.curr = null;
}

const fnames = Object.getOwnPropertyNames(Sketch.prototype).slice(5);
for (let i = 0; i < fnames.length; i++) {
    const f = fnames[i];
    eval("function " + f + "(...args) { return Sketches.curr." + f + "(...args); }");
}

const PI = Math.PI;
const HALF_PI = Math.PI / 2;
const TWO_PI = Math.PI * 2;

min = Math.min;
max = Math.max;
abs = Math.abs;
sqrt = Math.sqrt;
sin = Math.sin;
cos = Math.cos;
tan = Math.tan;
asin = Math.asin;
acos = Math.acos;
atan = Math.atan;

aliceblue = '#f0f8ff';
antiquewhite = '#faebd7';
aqua = '#00ffff';
aquamarine = '#7fffd4';
azure = '#f0ffff';
beige = '#f5f5dc';
bisque = '#ffe4c4';
black = '#000000';
blanchedalmond = '#ffebcd';
blue = '#0000ff';
blueviolet = '#8a2be2';
brown = '#6b3500';
burlywood = '#deb887';
cadetblue = '#5f9ea0';
chartreuse = '#7fff00';
chocolate = '#d2691e';
coral = '#ff7f50';
cornflowerblue = '#6495ed';
cornsilk = '#fff8dc';
crimson = '#dc143c';
cyan = '#00ffff';
darkblue = '#00008b';
darkcyan = '#008b8b';
darkgoldenrod = '#b8860b';
darkgray = '#a9a9a9';
darkgreen = '#006400';
darkgrey = '#a9a9a9';
darkkhaki = '#bdb76b';
darkmagenta = '#8b008b';
darkolivegreen = '#556b2f';
darkorange = '#ff8c00';
darkorchid = '#9932cc';
darkred = '#8b0000';
darksalmon = '#e9967a';
darkseagreen = '#8fbc8f';
darkslateblue = '#483d8b';
darkslategray = '#2f4f4f';
darkslategrey = '#2f4f4f';
darkturquoise = '#00ced1';
darkviolet = '#9400d3';
deeppink = '#ff1493';
deepskyblue = '#00bfff';
dimgray = '#696969';
dimgrey = '#696969';
dodgerblue = '#1e90ff';
firebrick = '#b22222';
floralwhite = '#fffaf0';
forestgreen = '#228b22';
fuchsia = '#ff00ff';
gainsboro = '#dcdcdc';
ghostwhite = '#f8f8ff';
gold = '#ffd700';
goldenrod = '#daa520';
gray = '#808080';
green = '#008000';
greenyellow = '#adff2f';
grey = '#808080';
honeydew = '#f0fff0';
hotpink = '#ff69b4';
indianred = '#cd5c5c';
indigo = '#4b0082';
ivory = '#fffff0';
khaki = '#f0e68c';
lavender = '#e6e6fa';
lavenderblush = '#fff0f5';
lawngreen = '#7cfc00';
lemonchiffon = '#fffacd';
lightblue = '#add8e6';
lightcoral = '#f08080';
lightcyan = '#e0ffff';
lightgoldenrodyellow = '#fafad2';
lightgray = '#d3d3d3';
lightgreen = '#90ee90';
lightgrey = '#d3d3d3';
lightpink = '#ffb6c1';
lightsalmon = '#ffa07a';
lightseagreen = '#20b2aa';
lightskyblue = '#87cefa';
lightslategray = '#778899';
lightslategrey = '#778899';
lightsteelblue = '#b0c4de';
lightyellow = '#ffffe0';
lime = '#00ff00';
limegreen = '#32cd32';
linen = '#faf0e6';
magenta = '#ff00ff';
maroon = '#800000';
mediumaquamarine = '#66cdaa';
mediumblue = '#0000cd';
mediumorchid = '#ba55d3';
mediumpurple = '#9370db';
mediumseagreen = '#3cb371';
mediumslateblue = '#7b68ee';
mediumspringgreen = '#00fa9a';
mediumturquoise = '#48d1cc';
mediumvioletred = '#c71585';
midnightblue = '#191970';
mintcream = '#f5fffa';
mistyrose = '#ffe4e1';
moccasin = '#ffe4b5';
navajowhite = '#ffdead';
navy = '#000080';
oldlace = '#fdf5e6';
olive = '#808000';
olivedrab = '#6b8e23';
orange = '#ffa500';
orangered = '#ff4500';
orchid = '#da70d6';
palegoldenrod = '#eee8aa';
palegreen = '#98fb98';
paleturquoise = '#afeeee';
palevioletred = '#db7093';
papayawhip = '#ffefd5';
peachpuff = '#ffdab9';
peru = '#cd853f';
pink = '#ffc0cb';
plum = '#dda0dd';
powderblue = '#b0e0e6';
purple = '#800080';
red = '#ff0000';
rosybrown = '#bc8f8f';
royalblue = '#4169e1';
saddlebrown = '#8b4513';
salmon = '#fa8072';
sandybrown = '#f4a460';
seagreen = '#2e8b57';
seashell = '#fff5ee';
sienna = '#a0522d';
silver = '#c0c0c0';
skyblue = '#87ceeb';
slateblue = '#6a5acd';
slategray = '#708090';
slategrey = '#708090';
snow = '#fffafa';
springgreen = '#00ff7f';
steelblue = '#4682b4';
tan = '#d2b48c';
teal = '#008080';
thistle = '#d8bfd8';
tomato = '#ff6347';
turquoise = '#40e0d0';
violet = '#ee82ee';
wheat = '#f5deb3';
white = '#ffffff';
whitesmoke = '#f5f5f5';
yellow = '#ffff00';
yellowgreen = '#9acd32';

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(vector) {
        if (vector instanceof Vector) {
            this.x += vector.x;
            this.y += vector.y;
        } else {
            this.x += vector;
            this.y += vector;
        }
        return this;
    }

    sub(vector) {
        if (vector instanceof Vector) {
            this.x -= vector.x;
            this.y -= vector.y;
        } else {
            this.x -= vector;
            this.y -= vector;
        }
        return this;
    }

    mult(vector) {
        if (vector instanceof Vector) {
            this.x *= vector.x;
            this.y *= vector.y;
        } else {
            this.x *= vector;
            this.y *= vector;
        }
        return this
    }

    div(vector) {
        if (vector instanceof Vector) {
            this.x /= vector.x;
            this.y /= vector.y;
        } else {
            this.x /= vector;
            this.y /= vector;
        }
        return this;
    }

    mag() {
        return sqrt(this.x * this.x + this.y * this.y);
    }

    magSq() {
        return this.x * this.x + this.y * this.y;
    }

    copy() {
        return new Vector(this.x, this.y);
    }

    normalize() {
        this.div(this.mag());
        return this;
    }

    setMag(num) {
        this.normalize().mult(num);
        return this;
    }

    limit(num) {
        const mag = this.mag();
        if (mag > num) {
            this.div(mag).mult(num);
        }
        return this;
    }

    angle() {
        return atan(this.y / this.x);
    }

    dot(v2) {
        return this.x * v2.x + this.y * v2.y;
    }

    getPerp() {
        return new Vector(-this.y, this.x);
    }

    set(x, y) {
        this.x = x; this.y = y;
    }

    rotate(angle) {
        const COS = cos(angle);
        const SIN = sin(angle);
        this.x = (this.x * COS - this.y * SIN);
        this.y = (this.x * SIN + this.y * COS);
        return this;
    }

    static random2D() {
        const vector = new Vector(random(), random());
        vector.normalize();
        return vector;
    }
    static add(v1, v2) {
        return new Vector(v1.x + v2.x, v1.y + v2.y);
    }
    static sub(v1, v2) {
        return new Vector(v1.x - v2.x, v1.y - v2.y);
    }
    static mult(v1, n) {
        return new Vector(v1.x * n, v1.y * n);
    }
    static div(v1, n) {
        return new Vector(v1.x / n, v1.y / n);
    }
    static normalize(v1) {
        return v1.copy().normalize();
    }
    static div(v1, n) {
        return v1.copy().setMag(n);
    }
    static dist(v1, v2) {
        return sqrt((v2.x - v1.x) * (v2.x - v1.x) + (v2.y - v1.y) * (v2.y - v1.y));
    }
    static dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }
    static areEqual(v1, v2) {
        return v1.x == v2.x && v1.y == v2.y;
    }
}

// console.log("static random2D() { const vector = new Vector(random(), random()); vector.normalize(); return vector; } static add(v1, v2) { return new Vector(v1.x + v2.x, v1.y + v2.y); } static sub(v1, v2) { return new Vector(v1.x - v2.x, v1.y - v2.y); } static mult(v1, n) { return new Vector(v1.x * n, v1.y * n); } static div(v1, n) { return new Vector(v1.x / n, v1.y / n); } static normalize(v1) { return v1.copy().normalize(); } static div(v1, n) { return v1.copy().setMag(n); } static dist(v1, v2) { return sqrt((v2.x - v1.x) * (v2.x - v1.x) + (v2.y - v1.y) * (v2.y - v1.y)); } static dot(v1, v2) { return v1.x * v2.x + v1.y * v2.y; } static areEqual(v1, v2) { return v1.x == v2.x && v1.y == v2.y; }".split("static").map(name => {
//     name = name.split('{')[0].slice(0, -1);
//     return `<h3><code>&lt;Vector&gt;.${name}</code></h3>
//     <p class="lead"></p>`
// }).join("↵"));

function dist(x1, y1, x2, y2) {
    return sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function distSq(x1, y1, x2, y2) {
    return (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
}

const floor = Math.floor;

function random(to, from, int) {
    if (to instanceof Array) return to[floor(random(to.length))]
    if (from != null) {
        if (int) {
            return floor(Math.random() * (to - from)) + (from);
        } else {
            return Math.random() * (to - from) + (from);
        }
    } else if (to != null) {
        if (int) {
            return floor(Math.random() * (to));
        } else {
            return random() * (to);
        }
    } else {
        return Math.random();
    }
}

class Entity {
    constructor(x, y, { render, update, ...options } = {}) {

        this.position = new Vector(x, y);
        Object.assign(this, options);
        this.setRender(render);
        this.setUpdate(update);
    }

    setRender(f) {
        if (f instanceof Function) this.render = f;
    }

    setUpdate(f) {
        if (f instanceof Function) this.update = f;
    }

    render(f) {

    }

    update(f) {

    }

    remove() {
        this.holder.entities = this.holder.entities.filter(entity => entity !== this);
    }

    static add(entity, sketch) {
        if (!(entity instanceof Entity)) throw new Error("Must pass a valid entity as first parameter");
        else if (!(sketch instanceof Sketch) && Sketches.curr == null) throw new Error("Outside sketch method: Must pass a Sketch instance as second parameter");
        else {
            entity.holder = sketch || Sketches.curr;
            if (!entity.holder.entities) entity.holder.entities = [];
            entity.holder.entities.push(entity);
            return entity;
        }
    }

    static get(sketch) {
        if (!(sketch instanceof Sketch) && Sketches.curr == null) throw new Error("Outside sketch method: Must pass a Sketch instance as second parameter");
        else return (sketch || Sketches.curr).entities;
    }

    static getByName(name, sketch) {
        if (!(sketch instanceof Sketch) && Sketches.curr == null) throw new Error("Outside sketch method: Must pass a Sketch instance as second parameter");
        else {
            const result = (sketch || Sketches.curr).entities.filter(entity => entity.name == name);
            return result.length == 1 ? result[0] : result;
        }
    }

    static loop(sketch) {
        if (!(sketch instanceof Sketch) && Sketches.curr == null) throw new Error("Outside sketch method: Must pass a Sketch instance as second parameter");
        else {
            if (sketch) fetchIntoGlobal(sketch);
            (sketch || Sketches.curr).entities.forEach(entity => {
                entity.update();
                entity.render(entity);
            });
            if (sketch) clearGlobal;
        }
    }
}

// const Render = {
//     circle() {
//         if (!obj.radius) return new Error("Radius not set for shape circle");

//         const sketch = obj.holder;
//         if (obj.fill) sketch.fill(obj.fill);
//         if (obj.stroke) sketch.stroke(obj.stroke);
//         obj.holder.circle(obj.position.x, obj.position.y, obj.radius);
//     },
//     rect() {
//         if (!obj.width) return new Error("Width not set for shape rect");

//         const sketch = obj.holder;
//         if (obj.fill) sketch.fill(obj.fill);
//         if (obj.stroke) sketch.stroke(obj.stroke);
//         obj.holder.rect(obj.position.x, obj.position.y, obj.width, obj.height);
//     }
// }
