/**
 * @author [Yahwant Raut]
 * @email [yashwantraut41@mail.com]
 * @create date 2026-07-15 22:58:11
 * @modify date 2026-08-18 22:35:31
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

// Added in 02-Perspective_Triangle 
let buffer_position = null;
let render_pipeline = null;
let buffer_mvpUniform = null;
let bindingGroup_mvpUniform = null;
let perspectiveProjectionMatrix = null;
let depthTexture = null;



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
    buffer_position = null;
    render_pipeline = null;
    buffer_mvpUniform = null;
    bindingGroup_mvpUniform = null;
    perspectiveProjectionMatrix = null;
    depthTexture = null;
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

    // Added in  02-Perspective_Triangle 
    //1.Write vertex shader code as string.
    // vertex shader code in WGSL
    const vertexShaderSourceCode =
        "struct MVPUniform" +
        "{" +
        "mvpMatrix : mat4x4<f32>" +
        "};" +
        "@group(0) @binding(0) var<uniform> mvpUniform : MVPUniform;" +
        "@vertex" + // vertex shader entry point and shader type
        "\n" +
        "fn main(@location(0) vPos : vec4<f32>) -> @builtin(position) vec4<f32>" + // vertex shader main function -> means return type is vec4<f32> and it is a builtin position variable
        "{" +
        "let vPosition = mvpUniform.mvpMatrix * vPos;" +
        "return vPosition;" +
        "}";

    // 2.Create Vertex shader module. GPUShaderModuleDescriptor
    // A. Create shader module descriptor.
    const shaderModuleDescriptor_vertexShader =
    {
        code: vertexShaderSourceCode
    };

    // B. Create  actual shader module. GPUShaderModule
    const shaderModule_vertexShader = device.createShaderModule(shaderModuleDescriptor_vertexShader);

    if (shaderModule_vertexShader == null) {
        console.log("Failed to create vertex shader module \n");
        throw Error("Failed to create vertex shader module \n");
    } else {
        console.log("Vertex shader module is created successfully \n");
    }

    // fragment shader code in WGSL
    const fragmentShaderSourceCode =
        "@fragment" + // vertex shader entry point and shader type
        "\n" +
        "fn main() -> @location(0) vec4<f32>" +  //this is output color of fragment shader  
        "{" +
        "let fragColor : vec4<f32> = vec4<f32>(1.0, 1.0, 1.0, 1.0);" +
        "return  fragColor;" +
        "}";

    // 2.Create Fragment shader module. GPUShaderModuleDescriptor
    // A. Create shader module descriptor.
    const shaderModuleDescriptor_fragmentShader =
    {
        code: fragmentShaderSourceCode
    };

    // B. Create  actual shader module. GPUShaderModule
    const shaderModule_fragmentShader = device.createShaderModule(shaderModuleDescriptor_fragmentShader);

    if (shaderModule_fragmentShader == null) {
        console.log("Failed to create Fragment shader module \n");
        throw Error("Failed to create Fragment shader module \n");
    } else {
        console.log("Fragment shader module is created successfully \n");
    }


    // 3.Declare postion array.
    const vertex_position = new Float32Array([
        0.0, 1.0, 0.0, 1.0,   //apex
        -1.0, -1.0, 0.0, 1.0,   //left bottom
        1.0, -1.0, 0.0, 1.0    //right bottom
    ]);

    // 4.Create vertex buffer for postion. GPUBufferDescriptor
    // A. Create buffer descriptor
    const bufferDescriptor_position =
    {
        size: vertex_position.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    };

    // B. Create  actual vertex buffer for position
    // GPUBuffer
    buffer_position = device.createBuffer(bufferDescriptor_position);

    if (buffer_position == null) {
        console.log("Failed to create vertex buffer for position \n");
        throw Error("Failed to create vertex buffer for position \n");
    } else {
        console.log("Vertex buffer for position is created successfully \n");
    }

    //  C. Write data (position array to above  created buffer)

    // four parameters are : destination buffer, destination offset, source data, source offset, source data length

    queue.writeBuffer(buffer_position, 0, vertex_position, 0, vertex_position.length);

    console.log("Writing Vertex position data  into position buffer is completed \n");
    //postion bufffer is buffer_position and we have written position data i.e vertex_position into it.  

    // 5.Now will do uniform plumbing for MVP Uniform
    // 5-> A. Uniforms will bind  to bind group in shader so create bind  group layout  for  our MVP  uniform
    // a. Bind group layout entry GPUBindGroupLayoutEntry
    const bindGroupLayoutEntry_mvpUniform =
    {
        binding: 0, // this matches with zeroth group and zeroth slot binding vertex shader  
        visibility: GPUShaderStage.VERTEX, // WE ARE going to use this layout in the vertex shader 
        buffer: {
            type: "uniform"
        }
    }

    // b. Create  bindgroup layout descriptor.GPUBindGroupLayoutDescriptor
    const bindGroupLayoutDescriptor = {
        entries: [bindGroupLayoutEntry_mvpUniform]
    };

    // c. Create  bindgroup layout. GPUBindGroupLayout
    const bindGroupLayout_mvpUniform = device.createBindGroupLayout(bindGroupLayoutDescriptor);

    if (bindGroupLayout_mvpUniform == null) {
        console.log("Failed to create bind group layout for MVP uniform \n");
        throw Error("Failed to create bind group layout for MVP uniform \n");
    } else {
        console.log("Bind group layout for MVP uniform is created successfully \n");
    }

    // 5->B. Create pipeline Layout  to specify  one  or many above  bind  groups layout.
    //a. first we will create pipeline layout descriptor. GPUPipelineLayoutDescriptor then
    const pipelineLayoutDescriptor = {
        bindGroupLayouts: [bindGroupLayout_mvpUniform]
    };

    // b. Create pipeline layout. GPUPipelineLayout
    const pipelineLayout = device.createPipelineLayout(pipelineLayoutDescriptor);

    if (pipelineLayout == null) {
        console.log("Failed to create pipeline layout for MVP uniform \n");
        throw Error("Failed to create pipeline layout for MVP uniform \n");
    } else {
        console.log("Pipeline layout for MVP uniform is created successfully \n");
    }


    // 5->C. Now  create uniform buffer for our uniform buffer
    // a. Create uniform buffer descriptor. GPUBufferDescriptor
    const mvpUniformSize = 4 * 16;

    const bufferDescriptor_mvpUniform = {
        size: mvpUniformSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    };

    //   b. Create  actual uniform buffer.
    // ## we will not write data  to uniform biuffer now as uniform buffer can
    //  change like in animation we will write data to this buffer in display
    buffer_mvpUniform = device.createBuffer(bufferDescriptor_mvpUniform);

    if (buffer_mvpUniform == null) {
        console.log("Failed to create uniform buffer for MVP uniform \n");
        throw Error("Failed to create uniform buffer for MVP uniform \n");
    } else {
        console.log("Uniform buffer for MVP uniform is created successfully \n");
    }

    // 5->D. Now create bind group for our uniform buffer
    // a. Create buffer binding for uniform buffer. GPUBufferBinding
    const bufferBinding_mvpUniform = {
        buffer: buffer_mvpUniform,
        offset: 0, // where to start reading data from buffer
        size: mvpUniformSize // how much data to read from buffer
    };

    // b. Create bind group entry for uniform buffer. GPUBindGroupEntry
    const bindGroupEntry_mvpUniform = {
        binding: 0, // this matches with zeroth group and zeroth slot binding vertex shader  @group(0) 
        resource: bufferBinding_mvpUniform // this is the resource that we are binding to the bind group entry
    };

    // c. Create bind group descriptor to specify above binding group entry. GPUBindGroupDescriptor
    const bindGroupDescriptor_mvpUniform = {
        entries: [bindGroupEntry_mvpUniform], // this is the entry that we are binding to the bind group
        layout: bindGroupLayout_mvpUniform // this is the layout that we are using for the bind group
    };

    // d. Create bind group for uniform buffer. GPUBindGroup
    // ## Will set this binding group in display.

    bindingGroup_mvpUniform = device.createBindGroup(bindGroupDescriptor_mvpUniform);

    if (bindingGroup_mvpUniform == null) {
        console.log("Failed to create bind group for MVP uniform \n");
        throw Error("Failed to create bind group for MVP uniform \n");
    } else {
        console.log("Bind group for MVP uniform is created successfully \n");
    }

    // 6   we will create PSO (Pipeline State Object) now we are going to create what is needed for PSO (Pipeline State Object) 
    // A Create render pipeline descriptor. GPURenderPipelineDescriptor
    // a. we need to vertex buffer layout descriptor. GPUVertexBufferLayoutDescriptor for that we need to create vertex attribute  
    // i. Create vertex attribute for position . GPUVertexAttribute 
    const positionVertexAttribute = {
        shaderLocation: 0, // this matches with @location(0) in vertex shader
        offset: 0, // this is the offset in the buffer where the attribute data starts
        format: "float32x4" // this is the format of the attribute data
    };

    // ii. Create gpu vertex buffer laout using above gpu vertex attribute. GPUVertexBufferLayout
    const positionVertexBufferLayout = {
        attributes: [positionVertexAttribute], // this is the array of attributes for the vertex buffer
        arrayStride: 4 * 4, // this is the size of one vertex in bytes (4 floats * 4 bytes per float)       
        stepMode: "vertex" // this means that the vertex buffer will be jumped to the next vertex for each vertex shader invocation
        //jump vertex by vertex not instance by instance
    };

    //b. Create vertex shader state . GPUVertexState
    const vertexShadeState = {
        module: shaderModule_vertexShader, // this is the vertex shader module that we created earlier
        entryPoint: "main", // this is the entry point of the vertex shader
        buffers: [positionVertexBufferLayout] // this is the array of vertex buffer layouts that we created earlier
    };

    //=================== Vertex Shader State is created successfully ===================

    //c. Create fragment shader state. GPUFragmentState
    // we need to create GPU fragment state  but before that create GPU color target state  
    // i. Create color target state. GPUColorTargetState
    const colorTargetState = {
        format: canvasFormat, // this is the format of the color attachment that we will render to
    };

    // ii. create  actual fragment shaderstate using above target color  state.
    // Create fragment shader state. GPUFragmentState
    const fragentShaderState = {
        module: shaderModule_fragmentShader, // this is the fragment shader module that we created earlier
        entryPoint: "main", // this is the entry point of the fragment shader
        targets: [colorTargetState] // this is the array of color target states that we created earlier
    };

    //the only difference between vertex shader state and fragment shader state is that vertex shader state has buffers and fragment shader state has targets

    // the final step required for PSO is to create the primitive state. GPUPrimitiveState
    //d. Create primitive state. GPUPrimitiveState
    const primitiveState = {
        frontFace: "ccw", // this means that the front face of the triangle is counter-clockwise
        cullMode: "none",// this means that no faces will be culled
        topology: "triangle-list", // this means that the vertices will be interpreted as a list of triangles
    };

    // Added in 06-Depth
    //depth stencil state
    const depthStencilState = {
        depthWriteEnabled: true, // this means that the depth buffer will be written to
        depthCompare: "less-equal", // this means that a fragment will pass the depth test if its depth is less than or equal to the current depth buffer value.
        format: "depth24plus-stencil8", // without stencil we can use "depth24plus" 
        //we are using "depth24plus-stencil8" because we may go for shadow mapping, deffeered rendering, decal rendering.
    };


    //e.  Finally  create the render pipeline  descriptor PSO (GPURenderPipelineDescriptor)
    const pipelineDescriptor = {
        layout: pipelineLayout, // this is the pipeline layout that we created earlier
        vertex: vertexShadeState, // this is the vertex shader state that we created earlier
        fragment: fragentShaderState, // this is the fragment shader state that we created earlier
        primitive: primitiveState, // this is the primitive state that we created earlier
        depthStencil: depthStencilState, // this is the depth stencil state that we created earlier
    };

    // B. Create render pipeline. GPURenderPipeline
    render_pipeline = device.createRenderPipeline(pipelineDescriptor);
    if (render_pipeline == null) {
        console.log("Failed to create render pipeline \n");
        throw Error("Failed to create render pipeline \n");
    } else {
        console.log("Render pipeline is created successfully \n");
    }

    // 7. Initialize the perspective projection matrix to identity matrix.
    perspectiveProjectionMatrix = mat4.create();

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

    // Added in 06-Depth
    // Create depth texture for depth testing

    if (device != null) {
        if (depthTexture != null) {
            depthTexture.destroy();
            depthTexture = null;
        }
        // to create depth texture we need to create GPUTextureDescriptor
        const depthTextureDescriptor = {
            size: [canvas.width, canvas.height, 1],
            dimension: "2d",
            format: "depth24plus-stencil8",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        };

        // now create depth texture using above depth texture descriptor. GPUTexture
        depthTexture = device.createTexture(depthTextureDescriptor);
        if (depthTexture == null) {
            console.log("Failed to create depth Texture \n");
            throw Error("Failed to create  depth Texture  \n");
        }
    }



    // /Initialze projection matrix
    mat4.perspective(perspectiveProjectionMatrix,
        45.0 * Math.PI / 180.0,
        parseFloat(canvas.width) / parseFloat(canvas.height),
        0.1,
        100.0);

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

    // Now  create render pass depth attachement 
    const renderPassDepthAttachment = {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
        stencilClearValue: 0,
        stencilLoadOp: "clear",
        stencilStoreOp: "store",
    }

    const renderPassDescriptor = {
        colorAttachments: [renderPassColorAttachment],
        depthStencilAttachment: renderPassDepthAttachment,
    };

    // Added in 02-Perspective_Triangle
    //1. Transformations for model, view and projection matrices
    //  A.  Create and initialize required matrices here  we need  model  view  matrix  and model view projection matrix
    const modelViewMatrix = mat4.create();
    const modelViewProjectionMatrix = mat4.create();
    //B.  Do  needed  transformations here  we do  only translation.
    // first param is target matrix, second param is source matrix, third param is translation vector
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -4.0]); //translate the modelview matrix by -4 units in z direction

    //C.  Now multiply modelview matrix with perspective projection matrix to get modelviewprojection matrix
    mat4.multiply(modelViewProjectionMatrix, perspectiveProjectionMatrix, modelViewMatrix);

    // Now write this MVP to the uniform buffer we  created in above 5-> C step.
    //D.  Now write this modelviewprojection matrix to uniform buffer
    // four parameters are : 
    // 1. destination buffer,
    // 2. destination buffer  offset where data writing will start,
    // 3. this is source data that we want to write in buffer, 
    // 4. in modelViewProjection matrix from to read so we are saying from 0th  offset,
    // 5. how much data we want to write from source 
    queue.writeBuffer(buffer_mvpUniform, 0, modelViewProjectionMatrix, 0, modelViewProjectionMatrix.length);


    //2. Start the render pass
    const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    // 3. Set folllowing properties of  renderpass  encoder

    //a. set the render pipeline
    renderPassEncoder.setPipeline(render_pipeline);

    //b set the viewport
    // viewport is the area of the canvas where we will render our scene.
    // four parameters are : 
    // 1.x  => this is the x coordinate of the top left corner of the viewport
    // 2.y  => this is the y coordinate of the top left corner of the viewport
    // 3.width => this is the width of the viewport
    // 4.height => this is the height of the viewport
    // 5.minDepth => this is the minimum depth value of the viewport
    // 6.maxDepth => this is the maximum depth value of the viewport
    renderPassEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);

    //c. set the scissor rect
    // scissor rect is the area of the viewport where we will render our scene.
    // four parameters are : 
    // 1.x  => this is the x coordinate of the top left corner of the scissor rect
    // 2.y  => this is the y coordinate of the top left corner of the scissor rect
    // 3.width => this is the width of the scissor rect
    // 4.height => this is the height of the scissor rect
    renderPassEncoder.setScissorRect(0, 0, canvas.width, canvas.height);

    //d set vertex buffer
    // vertex buffer is the buffer that contains the vertex data for our scene.
    // 1. first parameter is the slot number of the vertex buffer,
    // 2. second parameter is the vertex buffer that we want to set
    renderPassEncoder.setVertexBuffer(0, buffer_position);

    //e. set bind group
    // bind group is the group of resources that we want to bind to the pipeline.
    // 1. first parameter is the slot number of the bind group,
    // 2. second parameter is the bind group that we want to set
    renderPassEncoder.setBindGroup(0, bindingGroup_mvpUniform);

    //4. Draw the triangle
    // 1. first parameter is the number of vertices to draw
    renderPassEncoder.draw(3);

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

    //destroy depth texure
    if (depthTexture != null) {
        depthTexture.destroy();
        depthTexture = null;
    }

    if (context != null) {
        context.unconfigure();
        context = null;
    }

    if (device != null) {
        device.destroy();
        device = null;
        queue = null;
        buffer_position = null;
        render_pipeline = null;
        buffer_mvpUniform = null;
        bindingGroup_mvpUniform = null;
    }

    perspectiveProjectionMatrix = null;

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