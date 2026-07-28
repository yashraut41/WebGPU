/**
 * @author [Yahwant Raut]
 * @email [yashwantraut41@mail.com]
 * @create date 2026-07-15 22:58:11
 * @modify date 2026-07-15 22:58:24
 * @desc [description]
 */


//global variables 

var canvas = null;
var bFullScreen = false;
var canvas_original_width;
var canvas_original_height;

//webgpu  related 
var clear_color

let device = null;
let context = null;
let queue = null;
let canvasFormat = null;
let animationFrameId = null;


//how to start animation: to have requestAnimationFrame() to be called "crossbrowser" compatible
var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;


//To Stop animation : To have cancelAnimationFrame() to be calles "crossbrowser" compatible
var cancelAnimationFrame = window.cancelAnimationFrame ||
    window.webkitCancelRequestAnimationFrame || window.webkitCancelAnimationFrame ||
    window.mozCancelRequestAnimationFrame || window.mozCancelAnimationFrame ||
    window.oCancelRequestAnimationFrame || window.oCancelAnimationFrame ||
    window.msCancelRequestAnimationFrame || window.msCancelAnimationFrame;


// Asynchronous communication between the JavaScript thread and the GPU to avoid long waits for GPU completion
async function main(params) {

    canvas = document.getElementById("AMC");
    if (!canvas)
        console.log("Obtaining Canvas Failed \n");
    else
        console.log("Obtaining Canvas Succeeded \n");

    //print canvas width and height on console 
    console.log("Canvas Width:" + canvas.width + "Canvas Height:" + canvas.height);

    canvas_original_width = canvas.width;
    canvas_original_height = canvas.height;

    //Register Event Handler
    window.addEventListener("keydown", keyDown, false);
    window.addEventListener("click", mousedown, false);
    window.addEventListener("resize", resize, false);

    // Best practices for WebGPU during fullscreen 
    document.addEventListener('fullscreenchange', onFullScreenChange, false);
    document.addEventListener('webkitfullscreenchange', onFullScreenChange, false);

    // 1. initialize WebGPU
    const gpu = navigator.gpu;

    if (gpu == null) {
        console.log('WebGPU not supported on this browser \n');
        throw Error('WebGPU not supported on this browser \n')
    } else {
        console.log('WebGPU is supported on this browser \n');
    }

    // 2. Get GPUAdapter object from  GPU  Interface
    const adapter = await gpu.requestAdapter();
    if (adapter == null) {
        console.log('Failed  to retrieve  adapter from gpu  interface \n');
        throw Error('Failed  to retrieve  adapter from gpu  interface \n')
    } else {
        console.log('Successfully retrieved  adapter from gpu  interface \n');
    }

    // 3.  Get GPUDevice object from the adapter
    device = await adapter.requestDevice();
    if (device == null) {
        console.log('Failed  to retrieve  device from adapter \n');
        throw Error('Failed  to retrieve  device from adapter \n');
    }
    else {
        console.log('Successfully retrieved  device from adapter \n');
    }

    device.addEventListener('uncapturederror', onUncapturedError);

    // register a specific device lost event handler

    device.lost.then(onDeviceLost);

    // call stub functions from here  
    initialize();
    resize();
    display();

}

function onUncapturedError(event) {
    console.error("WebGPU uncaptured error:", event.Error.message);
}

function onDeviceLost(info) {
    console.warn("WebGPU  device lost  reason:", info.reason, "Message:", info.message);
    device = null;
    queue = null;
}

function toggleFullScreen() {
    //code
    var fullscreen_element = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || null;
    console.log("fullscreen_element:", fullscreen_element);
    //if not fullscreen
    if (fullscreen_element == null) {
        if (canvas.requestFullscreen)
            canvas.requestFullscreen();
        else if (canvas.mozRequestFullScreen)
            canvas.mozRequestFullScreen();
        else if (canvas.webkitRequestFullscreen)
            canvas.webkitRequestFullscreen();
        else if (canvas.msRequestFullscreen)
            canvas.msRequestFullscreen();
        // in WebGL we initialized bFullScreen here not thinking about  async operation but in WebGPU  considering possibility  async behaviour  of fullscreen  in cross browser compatibilty 
    }
    else {
        if (document.exitFullscreen)
            document.exitFullscreen();
        else if (document.mozCancelFullScreen)
            document.mozCancelFullScreen();
        else if (document.webkitExitFullscreen)
            document.webkitExitFullscreen();
        else if (document.msExitFullscreen)
            document.msExitFullscreen();
        // in WebGL we initialized bFullScreen here not thinking about  async operation but in WebGPU  considering possibility  async behaviour  of fullscreen  in cross browser compatibilty 

    }
}

function onFullScreenChange() {
    //code 
    var fullscreen_element = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || null;

    console.log("onFullScreenChange: fullscreen_element:", fullscreen_element);
    if (fullscreen_element !== null) {
        bFullScreen = true;
    } else {
        bFullScreen = false;
    }
    resize();
}

function initialize() {

    queue = device.queue;

    console.log('webgpu queue  is obtained successfully');

    //now get the webGPU context 
    context = canvas.getContext('webgpu');

    if (context == null) {
        console.log("failed to get the rendering context foe WebGPU");
        throw Error('failed to get the rendering context foe WebGPU')
    }

    // Get the preferred WebGPU color format for the canvas. 
    canvasFormat = navigator.gpu.getPreferredCanvasFormat();

    // 8. Configure the canvas  by using  this obtained canvas format to suit  our needs.
    const canvasConfiguration = {
        device: device,
        format: canvasFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        alphaMode: "opaque"
    };

    context.configure(canvasConfiguration);
    console.log('canvas configuration is done successfully for WebGPU with format:', canvasFormat, "\n");

    // define the  clear  color for the canvas
    clear_color = {
        r: 0.0,
        g: 0.0,
        b: 1.0,
        a: 1.0
    };

}


function resize() {
    console.log("resize() is called \n");
    //code
    if (bFullScreen == true) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    else {
        canvas.width = canvas_original_width;
        canvas.height = canvas_original_height;
    }
}

function display() {
    //code
    //device maybe lost and initialization may not be done yet 

    if (device == null) {
        return;
    }

    /**
     * GPUCommandEncoder is used to record commands for the GPU to execute. 
     It allows you to create command buffers that can be submitted to the GPU 
     for rendering or computation tasks. The command encoder is responsible for 
    encoding various GPU commands, such as drawing, copying data, and setting pipeline states.
    */
    const commandEncoder = device.createCommandEncoder();

    if (commandEncoder == null) {
        console.log("Failed to create command encoder \n");
        throw Error("Failed to create command encoder \n");
    }

    const renderPassColorAttachment = {
        view: context.getCurrentTexture().createView(),
        clearValue: clear_color,
        loadOp: 'clear',
        storeOp: 'store'
    };

    const renderPassDescriptor = {
        colorAttachments: [renderPassColorAttachment]
    };

    //  start the render pass
    const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    //end the render pass
    renderPassEncoder.end();

    // Finish encoding commands and submit them to the GPU queue
    const commandBuffer = commandEncoder.finish();
    queue.submit([commandBuffer]);


    animationFrameId = requestAnimationFrame(display);

}

function update() {

}

function uninitialize() {
    //code
    // use animation frame id to cancel the animation frame
    if (animationFrameId != null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (context != null) {
        context.unconfigure();
        context = null;
    }

    if (device != null) {
        device.destroy();
        device = null;
        queue = null;
    }

    console.log("Uninitialize is successfull.");
}

function keyDown(event) {
    //code
    switch (event.key) {
        case "Escape":
            uninitialize();
            // windoe.close() may not work in all browsers due to security reasons.
            window.close();
            break;
        case "f":
        case "F":
            toggleFullScreen();
            break;

        default:
            break;
    }
}

function mousedown() {
    //code
    //do something here for mouse click
}