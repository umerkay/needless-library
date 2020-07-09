<img src="https://umerkay.github.io/needlessjs/src/logo/main.png" width="100" title="needlessjs logo"></img>
# needless
Needless aims to make the process of working with canvases in JavaScript much simpler and more intuitive than it currently is. It enables Sketches, Games, Computer Graphic projects, and more, with the JavaScript that matters and without the need to work with DOM elements and to setup redundant code for every project.

# Setting Up
## The HTML
Including needless into your project is very simple. Just copy the code below and paste it into your .html file. This will fetch the library file through CDN and make it available for use. If you prefer to work with the library locally you may download the file and replace the link with the path of the file on your computer
```html
<script src="https://cdn.jsdelivr.net/gh/umerkk164/needless-library@master/needless.js"></script>
```

## The JavaScript
Now you need to add a new sketch to your project. Calling `new Sketch();` will create a sketch with all default settings, which is good for now.

An object literal may be passed into the Sketch constructor. We will change the width and the height of the Sketch. For a list of all available options, click [here](https://umerkk164.github.io/needlessjs/documentation#options). Inside another script tag in your `.html`, include the following code.

```html
<script>
    var mysketch = new Sketch({ width: 600, height: 400 });
</script>
```

Obviously the Sketch does not do much right now. But we can use the init method to initiate the Sketch. The init method accepts a function. You may use all Sketch drawing methods inside the function in a local context without the need to use this. For a list of all drawing methods, click [here](https://umerkk164.github.io/needlessjs/documentation#drawing).
We will then tell our init function to draw a few circles on the canvas.

```javascript
var mysketch = new Sketch({ width: 600, height: 400 });
mysketch.init(function () {
    fill(red); //sets the color to red
    circle(30, 50, 25); //circle(x, y, radius)
    circle(130, 20, 35);
});
```

This is precisely it. Every sketch runs on a loop, and so after we initiate the Sketch we can use the loop method to draw something new every frame.

We will now draw a circle at the mouse position using the mouse Object. Note that `clear();` is used to erase the previous drawing every loop.

*Try without the clear method and see what happens.*

```javascript
var mysketch = new Sketch({ width: 600, height: 400 });
mysketch.init();
mysketch.loop(function () {
    clear();
    fill(red);
    circle(mouse.position.x, mouse.position.y, 50);
});

Sketches.loop();
```

*Note that we include Sketches.loop(); at the end to tell all our sketches to start using the loop function we provided. This will make more sense when working with more than one sketch.*

# Now What?
The possibilities from here are endless for you. But to fuel these adventures you will need to learn more about the library. You can refer to the documents below to learn more about how each module works. For now the first two documents will be enough and you can read the rest as you go.
[Needless Website](https://umerkk164.github.io/needlessjs/)
